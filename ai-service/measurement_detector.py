"""
Body measurement detection using MediaPipe Pose and proportional scaling.
Estimates chest, waist, shoulder, sleeve length, and height from a full-body photo.
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Optional

mp_pose = mp.solutions.pose


class BodyMeasurementDetector:
    """Detects body landmarks and estimates tailoring measurements in centimeters."""

    # Average adult proportions (cm) used when calibrating from known height
    PROPORTIONS = {
        "shoulder": 0.259,  # shoulder width / height
        "chest": 0.52,      # chest circumference / height
        "waist": 0.47,
        "sleeve": 0.36,     # sleeve length / height
        "hips": 0.54,
        "inseam": 0.45,
    }

    def __init__(self, reference_height_cm: float = 170.0):
        self.reference_height_cm = reference_height_cm
        self.pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5,
        )

    def _landmark_distance(self, lm_a, lm_b, image_w: int, image_h: int) -> float:
        ax, ay = lm_a.x * image_w, lm_a.y * image_h
        bx, by = lm_b.x * image_w, lm_b.y * image_h
        return float(np.hypot(ax - bx, ay - by))

    def detect_from_image(self, image_bgr: np.ndarray, height_cm: Optional[float] = None) -> dict:
        image_h, image_w = image_bgr.shape[:2]
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if not results.pose_landmarks:
            raise ValueError("No human pose detected. Use a full-body front-facing photo.")

        lm = results.pose_landmarks.landmark
        idx = mp_pose.PoseLandmark

        # Pixel distances between key landmarks
        shoulder_w = self._landmark_distance(
            lm[idx.LEFT_SHOULDER], lm[idx.RIGHT_SHOULDER], image_w, image_h
        )
        torso_l = self._landmark_distance(
            lm[idx.LEFT_SHOULDER], lm[idx.LEFT_ANKLE], image_w, image_h
        )
        torso_r = self._landmark_distance(
            lm[idx.RIGHT_SHOULDER], lm[idx.RIGHT_ANKLE], image_w, image_h
        )
        torso_h = (torso_l + torso_r) / 2
        sleeve_px = self._landmark_distance(
            lm[idx.LEFT_SHOULDER], lm[idx.LEFT_WRIST], image_w, image_h
        )
        hip_w = self._landmark_distance(
            lm[idx.LEFT_HIP], lm[idx.RIGHT_HIP], image_w, image_h
        )

        # Calibrate scale: pixels per cm from user height or estimated body height
        if height_cm and height_cm > 100:
            scale = height_cm / max(torso_h, 1)
            detected_height = height_cm
        else:
            # Estimate height from torso (shoulder to ankle ~ 75% of height)
            estimated_height_px = torso_h / 0.75
            detected_height = self.reference_height_cm
            scale = detected_height / max(estimated_height_px, 1)

        shoulder_cm = round(shoulder_w * scale, 1)
        sleeve_cm = round(sleeve_px * scale, 1)
        height_detected = round(torso_h * scale / 0.75, 1)

        # Circumference estimates from widths using ellipse approximation (pi * avg axis)
        chest_width = shoulder_w * 1.15
        waist_width = hip_w * 0.85
        chest_cm = round(np.pi * (chest_width * scale / 2 + shoulder_cm / 4), 1)
        waist_cm = round(np.pi * (waist_width * scale / 2), 1)
        hips_cm = round(np.pi * (hip_w * scale / 2), 1)
        inseam_cm = round(height_detected * self.PROPORTIONS["inseam"], 1)

        confidence = min(0.95, 0.6 + (results.pose_landmarks.landmark[0].visibility or 0.5) * 0.35)

        return {
            "measurements": {
                "chest": chest_cm,
                "waist": waist_cm,
                "shoulder": shoulder_cm,
                "sleeve_length": sleeve_cm,
                "height": height_detected if not height_cm else height_cm,
                "hips": hips_cm,
                "inseam": inseam_cm,
                "unit": "cm",
            },
            "confidence": round(confidence, 2),
            "landmarks_detected": True,
            "method": "mediapipe_pose_proportional",
        }

    def close(self):
        self.pose.close()
