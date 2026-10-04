/** Navigate from a stack screen to a tab inside Main */
export function goToMainTab(navigation, screen) {
  const parent = navigation.getParent?.();
  if (parent) {
    parent.navigate('Main', { screen });
  } else {
    navigation.navigate('Main', { screen });
  }
}
