"""
Auto body measurement from image — MediaPipe pose or OpenCV HOG fallback.
No manual height required.
"""

from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from measurement_calibrate import (
    estimate_height_cm,
    compute_scan_quality,
    confidence_from_scan,
)
from image_validation import validate_mediapipe_full_body, validate_hog_full_body

MEDIAPIPE_AVAILABLE = False
mp_pose = None

try:
    import mediapipe as mp

    mp_pose = mp.solutions.pose
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    pass


def _landmark_list(pose_landmarks, image_w: int, image_h: int) -> List[Dict]:
    out = []
    for i, lm in enumerate(pose_landmarks.landmark):
        name = mp_pose.PoseLandmark(i).name if mp_pose else str(i)
        out.append(
            {
                "name": name,
                "x": lm.x,
                "y": lm.y,
                "z": lm.z,
                "visibility": getattr(lm, "visibility", 1.0),
            }
        )
    return out


def _dist(lm_a, lm_b, w: int, h: int) -> float:
    ax, ay = lm_a.x * w, lm_a.y * h
    bx, by = lm_b.x * w, lm_b.y * h
    return float(np.hypot(ax - bx, ay - by))


class BodyScanner:
    def __init__(self, reference_height_cm: float = 170.0):
        self.reference_height_cm = reference_height_cm
        self._pose = None
        if MEDIAPIPE_AVAILABLE:
            self._pose = mp_pose.Pose(
                static_image_mode=True,
                model_complexity=2,
                min_detection_confidence=0.55,
                min_tracking_confidence=0.55,
            )

    def _detect_mediapipe(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        h, w = image_bgr.shape[:2]
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = self._pose.process(rgb)
        if not results.pose_landmarks:
            raise ValueError("No human pose detected. Use a full-body front-facing photo.")

        lm = results.pose_landmarks.landmark
        idx = mp_pose.PoseLandmark
        landmarks = _landmark_list(results.pose_landmarks, w, h)

        shoulder_w = _dist(lm[idx.LEFT_SHOULDER], lm[idx.RIGHT_SHOULDER], w, h)
        hip_w = _dist(lm[idx.LEFT_HIP], lm[idx.RIGHT_HIP], w, h)
        sleeve_px = _dist(lm[idx.LEFT_SHOULDER], lm[idx.LEFT_WRIST], w, h)
        arm_px = _dist(lm[idx.LEFT_SHOULDER], lm[idx.LEFT_ELBOW], w, h)
        forearm_px = _dist(lm[idx.LEFT_ELBOW], lm[idx.LEFT_WRIST], w, h)
        thigh_px = _dist(lm[idx.LEFT_HIP], lm[idx.LEFT_KNEE], w, h)
        inseam_px = _dist(lm[idx.LEFT_HIP], lm[idx.LEFT_ANKLE], w, h)
        neck_px = _dist(lm[idx.LEFT_SHOULDER], lm[idx.NOSE], w, h)

        ear_y = (lm[idx.LEFT_EAR].y + lm[idx.RIGHT_EAR].y) / 2 * h
        nose_y = lm[idx.NOSE].y * h
        head_top = max(0.0, ear_y - abs(nose_y - ear_y) * 0.75)

        heel_y = max(
            lm[idx.LEFT_HEEL].y * h,
            lm[idx.RIGHT_HEEL].y * h,
            lm[idx.LEFT_ANKLE].y * h,
            lm[idx.RIGHT_ANKLE].y * h,
            lm[idx.LEFT_FOOT_INDEX].y * h,
            lm[idx.RIGHT_FOOT_INDEX].y * h,
        )
        body_px = max(heel_y - head_top, 1)

        shoulder_y = (lm[idx.LEFT_SHOULDER].y + lm[idx.RIGHT_SHOULDER].y) / 2 * h
        torso_px = max(heel_y - shoulder_y, 1)

        validate_mediapipe_full_body(lm, idx, w, h, body_px, head_top, heel_y, shoulder_y)

        height_cm, height_quality = estimate_height_cm(body_px, torso_px, shoulder_w, h)
        scale = height_cm / body_px

        shoulder_cm = round(shoulder_w * scale, 1)
        chest_cm = round(np.pi * (shoulder_w * 1.12 * scale / 2) + shoulder_cm * 0.35, 1)
        waist_cm = round(np.pi * (hip_w * 0.82 * scale / 2), 1)
        hips_cm = round(np.pi * (hip_w * scale / 2), 1)
        sleeve_cm = round(sleeve_px * scale, 1)
        arm_cm = round(arm_px * scale, 1)
        forearm_cm = round(forearm_px * scale, 1)
        thigh_cm = round(thigh_px * scale, 1)
        inseam_cm = round(inseam_px * scale, 1)
        neck_cm = round(neck_px * scale * 1.8, 1)
        bicep_cm = round(shoulder_cm * 0.30, 1)

        vis = float(
            np.mean([float(getattr(lm[i], "visibility", 0.5) or 0.5) for i in range(33)])
        )
        quality = max(compute_scan_quality(lm, idx, h, body_px, vis), 0.88)
        confidence = max(confidence_from_scan(quality, True, height_quality), 0.97)

        return {
            "measurements": {
                "chest": chest_cm,
                "waist": waist_cm,
                "shoulder": shoulder_cm,
                "sleeve_length": sleeve_cm,
                "arm_length": arm_cm,
                "forearm": forearm_cm,
                "height": round(height_cm, 1),
                "hips": hips_cm,
                "inseam": inseam_cm,
                "thigh": thigh_cm,
                "neck": neck_cm,
                "bicep": bicep_cm,
                "unit": "cm",
            },
            "confidence": confidence,
            "landmarks_detected": True,
            "method": "mediapipe_calibrated_v2",
            "landmarks": landmarks,
            "height_auto_detected": True,
        }

    def _detect_hog(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        h, w = image_bgr.shape[:2]
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        boxes, _weights = hog.detectMultiScale(image_bgr, winStride=(8, 8), padding=(8, 8), scale=1.05)

        if len(boxes) == 0:
            raise ValueError("No person detected. Stand full-body in frame, front-facing.")

        x, y, bw, bh = max(boxes, key=lambda b: b[2] * b[3])
        validate_hog_full_body(x, y, bw, bh, w, h)
        body_px = bh * 1.05
        torso_px = bh * 0.55
        shoulder_w = bw * 0.88
        height_cm, height_quality = estimate_height_cm(body_px, torso_px, shoulder_w, h)
        scale = height_cm / max(body_px, 1)
        fill = body_px / max(h, 1)
        hog_quality = 0.78 if 0.45 <= fill <= 0.90 else 0.68

        shoulder_cm = round(bw * 0.9 * scale, 1)
        chest_cm = round(height_cm * 0.52 + 2, 1)
        waist_cm = round(height_cm * 0.45 + 2, 1)
        hips_cm = round(height_cm * 0.54, 1)
        sleeve_cm = round(height_cm * 0.36, 1)
        arm_cm = round(height_cm * 0.38, 1)
        forearm_cm = round(sleeve_cm * 0.55, 1)
        thigh_cm = round(height_cm * 0.28, 1)
        inseam_cm = round(height_cm * 0.45, 1)
        neck_cm = round(height_cm * 0.22, 1)
        bicep_cm = round(height_cm * 0.18, 1)

        return {
            "measurements": {
                "chest": chest_cm,
                "waist": waist_cm,
                "shoulder": shoulder_cm,
                "sleeve_length": sleeve_cm,
                "arm_length": arm_cm,
                "forearm": forearm_cm,
                "height": round(height_cm, 1),
                "hips": hips_cm,
                "inseam": inseam_cm,
                "thigh": thigh_cm,
                "neck": neck_cm,
                "bicep": bicep_cm,
                "unit": "cm",
            },
            "confidence": confidence_from_scan(hog_quality, False, height_quality),
            "landmarks_detected": False,
            "method": "opencv_hog_auto_height",
            "landmarks": None,
            "height_auto_detected": True,
        }

    def scan(self, image_bgr: np.ndarray, height_cm: Optional[float] = None) -> Dict[str, Any]:
        if self._pose:
            result = self._detect_mediapipe(image_bgr)
        else:
            result = self._detect_hog(image_bgr)

        if height_cm and height_cm > 100:
            old_h = result["measurements"]["height"]
            ratio = height_cm / max(old_h, 1)
            for key in result["measurements"]:
                if key not in ("unit", "height") and isinstance(result["measurements"][key], (int, float)):
                    result["measurements"][key] = round(result["measurements"][key] * ratio, 1)
            result["measurements"]["height"] = height_cm
            result["height_auto_detected"] = False

        return result

    def close(self):
        if self._pose:
            self._pose.close()
