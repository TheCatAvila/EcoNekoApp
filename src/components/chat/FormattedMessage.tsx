import { Text, View } from 'react-native';

/** Formateador ligero para renderizar negritas (**texto**) y listas sin librerías externas */
export default function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} className="font-bold text-neutral-900">
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View className="gap-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} className="h-1" />;

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          return (
            <View key={idx} className="flex-row items-start gap-2 pl-1">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <Text selectable className="flex-1 text-sm leading-relaxed text-neutral-800">
                {renderInline(trimmed.slice(2))}
              </Text>
            </View>
          );
        }

        return (
          <Text key={idx} selectable className="text-sm leading-relaxed text-neutral-800">
            {renderInline(line)}
          </Text>
        );
      })}
    </View>
  );
}
