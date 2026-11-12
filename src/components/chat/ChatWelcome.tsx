import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  Bot,
  CreditCard,
  HelpCircle,
  Receipt,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { formatCLP } from '../../lib/currency';
import type { Account } from '../../types/finance';
import { colors } from '../ui/theme';

const QUICK_PROMPTS: {
  category: string;
  title: string;
  prompt: string;
  Icon: LucideIcon;
  iconColor: string;
  box: string;
}[] = [
  {
    category: 'Diagnóstico',
    title: '¿Cómo va mi mes financiero?',
    prompt: 'Hazme un resumen de cómo va mi mes financiero actual, considerando mis ingresos, gastos y liquidez.',
    Icon: TrendingUp,
    iconColor: '#059669',
    box: 'bg-emerald-50 border-emerald-100',
  },
  {
    category: 'Tarjetas y Deuda',
    title: '¿Qué tarjeta debo priorizar pagar?',
    prompt: 'Según mis tarjetas de crédito, cupos utilizados y próximos pagos, ¿cuál me recomiendas priorizar?',
    Icon: CreditCard,
    iconColor: '#d97706',
    box: 'bg-amber-50 border-amber-100',
  },
  {
    category: 'Egresos Fijos',
    title: 'Analiza mis suscripciones y cuotas',
    prompt: '¿Qué porcentaje de mis ingresos se está yendo en suscripciones y compras en cuotas? ¿Dónde puedo recortar?',
    Icon: Receipt,
    iconColor: colors.purple600,
    box: 'bg-purple-50 border-purple-100',
  },
  {
    category: 'Planificación',
    title: '¿Cuánto puedo gastar o ahorrar hoy?',
    prompt: 'Considerando mi dinero líquido y lo que debo pagar este mes en tarjetas, ¿cuánto margen real tengo para ahorrar o gastar?',
    Icon: Wallet,
    iconColor: colors.blue600,
    box: 'bg-blue-50 border-blue-100',
  },
];

const QUICK_QUESTIONS = [
  '¿Me alcanza mi liquidez para cubrir lo facturado este mes?',
  '¿Cuál es mi tarjeta con mayor deuda acumulada?',
  'Dame un plan de 3 pasos para bajar mi cupo utilizado',
  '¿Qué gastos hormiga o suscripciones debería revisar?',
];

interface Props {
  accounts: Account[];
  loadingContext: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
}

function ContextRow({ title, subtitle, value, valueClass }: { title: string; subtitle: string; value: number; valueClass: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-800 p-3.5">
      <View className="flex-1">
        <Text className="text-[11px] text-neutral-400">{title}</Text>
        <Text className="text-xs text-neutral-500">{subtitle}</Text>
      </View>
      <Text className={`text-sm font-bold ${valueClass}`}>{formatCLP(value)}</Text>
    </View>
  );
}

/** Pantalla de bienvenida del chat. En móvil incluye el "contexto financiero" que en web era una columna lateral. */
export default function ChatWelcome({ accounts, loadingContext, disabled, onSend }: Props) {
  const creditAccounts = accounts.filter((a) => a.isCreditAccount);
  const liquidAccounts = accounts.filter((a) => !a.isCreditAccount);
  const totalLiquidity = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCreditUsed = creditAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalBilledThisMonth = creditAccounts.reduce(
    (sum, a) => sum + (a.paymentRequiredThisMonth || 0),
    0,
  );

  return (
    <View className="gap-6 py-2">
      <View className="items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl border border-amber-200 bg-amber-50 shadow-sm">
          <Sparkles size={32} color="#d97706" />
        </View>
        <Text className="mb-2 text-center text-xl font-black text-neutral-900">
          ¿Qué analizamos hoy en tus finanzas?
        </Text>
        <Text className="text-center text-sm text-neutral-500">
          Puedo revisar tus saldos líquidos, cupos utilizados de tarjetas, estados de cuenta,
          suscripciones y compras en cuotas para darte respuestas exactas.
        </Text>
      </View>

      <View className="gap-3">
        {QUICK_PROMPTS.map(({ category, title, prompt, Icon, iconColor, box }) => (
          <Pressable
            key={title}
            disabled={disabled}
            onPress={() => onSend(prompt)}
            className="gap-3 rounded-2xl border border-neutral-100 bg-white p-4 active:border-neutral-900"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {category}
              </Text>
              <View className={`rounded-xl border p-2 ${box}`}>
                <Icon size={16} color={iconColor} />
              </View>
            </View>
            <View>
              <Text className="mb-1 text-sm font-bold text-neutral-900">{title}</Text>
              <Text numberOfLines={2} className="text-xs text-neutral-500">
                {prompt}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Contexto financiero activo */}
      <View className="gap-5 rounded-3xl bg-neutral-900 p-6 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Bot size={20} color={colors.amber400} />
            <Text className="text-sm font-bold text-white">Contexto Financiero Activo</Text>
          </View>
          <View className="rounded-md bg-green-500/20 px-2 py-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-green-400">En vivo</Text>
          </View>
        </View>

        <Text className="text-xs leading-relaxed text-neutral-400">
          NekoAI utiliza automáticamente este resumen de tus cuentas para responder con cálculos
          reales:
        </Text>

        {loadingContext ? (
          <View className="items-center py-6">
            <ActivityIndicator color={colors.neutral400} />
          </View>
        ) : (
          <View className="gap-3">
            <ContextRow
              title="Liquidez disponible"
              subtitle={`${liquidAccounts.length} cuenta(s) vista/efectivo`}
              value={totalLiquidity}
              valueClass="text-green-400"
            />
            <ContextRow
              title="Cupo de crédito usado"
              subtitle={`${creditAccounts.length} tarjeta(s) de crédito`}
              value={totalCreditUsed}
              valueClass="text-red-400"
            />
            <ContextRow
              title="Facturado por pagar este mes"
              subtitle="Total estados de cuenta"
              value={totalBilledThisMonth}
              valueClass="text-amber-300"
            />
          </View>
        )}
      </View>

      {/* Consultas rápidas */}
      <View className="gap-3 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
        <View className="flex-row items-center gap-2">
          <HelpCircle size={16} color={colors.amber500} />
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Consultas rápidas
          </Text>
        </View>
        <View className="gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <Pressable
              key={q}
              disabled={disabled}
              onPress={() => onSend(q)}
              className="rounded-xl bg-neutral-50 p-3 active:bg-neutral-900"
            >
              {({ pressed }) => (
                <Text className={`text-xs font-medium ${pressed ? 'text-white' : 'text-neutral-700'}`}>
                  “{q}”
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Nota de privacidad */}
      <View className="flex-row items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <ShieldAlert size={16} color="#d97706" />
        <Text className="flex-1 text-[11px] leading-relaxed text-amber-900">
          Tus números de tarjeta completos y contraseñas nunca son compartidos con el modelo de IA.
          Solo se analizan montos, categorías y fechas.
        </Text>
      </View>
    </View>
  );
}
