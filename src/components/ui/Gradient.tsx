import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

// Tailwind en React Native no soporta bg-gradient-to-*; usamos expo-linear-gradient
// y lo habilitamos para recibir className.
cssInterop(LinearGradient, { className: 'style' });

export function Gradient(props: LinearGradientProps & { className?: string }) {
  return <LinearGradient {...props} />;
}
