import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  AlertTriangle,
  CalendarDays,
  PiggyBank,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { formatCLP } from '../../lib/currency';
import type { CreditHealth, DashboardHomeData } from '../../types/finance';
import { colors } from '../ui/theme';

export type { DashboardHomeData } from '../../types/finance';

interface DashboardHomeProps {
  data: DashboardHomeData;
  onAddIncome: () => void;
}

// Umbrales del backend: <= 30 saludable, <= 60 precaución, > 60 riesgo
const HEALTH_STYLES: Record<
  CreditHealth,
  { label: string; bar: string; badge: string; badgeText: string; hint: string }
> = {
  Healthy: {
    label: 'Saludable',
    bar: 'bg-green-500',
    badge: 'bg-green-100',
    badgeText: 'text-green-700',
    hint: 'Estás usando una parte baja de tu cupo.',
  },
  Warning: {
    label: 'Precaución',
    bar: 'bg-yellow-400',
    badge: 'bg-yellow-100',
    badgeText: 'text-yellow-800',
    hint: 'Tu uso de crédito supera el 30% del cupo.',
  },
  Danger: {
    label: 'Riesgo',
    bar: 'bg-red-500',
    badge: 'bg-red-100',
    badgeText: 'text-red-700',
    hint: 'Tu uso de crédito supera el 60% del cupo.',
  },
};

const monthName = (month: number, year: number) => {
  const name = new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'long' });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

function BreakdownRow({
  label,
  value,
  sign,
  strong = false,
}: {
  label: string;
  value: number;
  sign?: '+' | '-' | '=';
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1 flex-row">
        {sign && <Text className="w-4 text-sm text-neutral-500">{sign}</Text>}
        <Text className={`flex-1 text-sm ${strong ? 'font-bold text-white' : 'text-neutral-400'}`}>
          {label}
        </Text>
      </View>
      <Text className={`text-sm text-white ${strong ? 'font-bold' : 'font-medium'}`}>
        {formatCLP(value)}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, valueClassName = '' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <View className="flex-row justify-between gap-2">
      <Text className="flex-1 text-sm text-neutral-500">{label}</Text>
      <Text className={`text-sm font-bold text-neutral-900 ${valueClassName}`}>{value}</Text>
    </View>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-5 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </View>
  );
}

function StatTile({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <View className="flex-row items-center gap-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-bold text-neutral-500">{label}</Text>
        <Text numberOfLines={1} className={`text-xl font-black ${valueClassName}`}>
          {formatCLP(value)}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardHome({ data, onAddIncome }: DashboardHomeProps) {
  const { safeToSpend: s } = data;
  const health = HEALTH_STYLES[data.creditHealthSemaphore] ?? HEALTH_STYLES.Healthy;

  const isPeriodActive = s.remainingDaysInMonth > 0; // el backend devuelve 0 si no es el mes en curso
  const hasIncome = data.totalMonthlyIncome > 0;
  const creditMarginNegative = s.healthyCreditMargin < 0;
  const utilization = Math.min(Math.max(data.creditUtilizationRatio, 0), 100);

  return (
    <View className="gap-4" accessibilityLabel="Resumen financiero">
      <View className="flex-row items-center justify-between px-1">
        <Text className="flex-1 text-lg font-bold text-neutral-800">
          Resumen de {monthName(data.month, data.year)}
        </Text>
        <Pressable
          onPress={onAddIncome}
          accessibilityRole="button"
          className="flex-row items-center gap-2 rounded-xl bg-green-600 px-4 py-2 active:scale-95 active:bg-green-700"
        >
          <Plus size={16} color={colors.white} />
          <Text className="text-sm font-bold text-white">Ingreso</Text>
        </Pressable>
      </View>

      {/* Liquidez segura: lo primero que debe ver el usuario */}
      <View className="gap-8 rounded-3xl bg-neutral-900 p-6">
        <View className="gap-6">
          <View>
            <View className="mb-2 flex-row items-center gap-2">
              <ShieldCheck size={16} color={colors.green400} />
              <Text className="text-sm text-neutral-400">Liquidez disponible segura</Text>
            </View>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              className={`text-4xl font-black tracking-tight ${
                s.isInLiquidityDeficit ? 'text-red-400' : 'text-white'
              }`}
            >
              {formatCLP(s.safeLiquidBalance)}
            </Text>
          </View>

          {s.isInLiquidityDeficit && (
            <View className="flex-row items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle size={20} color={colors.red400} />
              <Text className="flex-1 text-sm text-red-200">
                Tus compromisos superan tu saldo líquido por{' '}
                <Text className="font-bold text-white">
                  {formatCLP(Math.abs(s.safeLiquidBalance))}
                </Text>
                . Necesitas ese monto para cubrir lo ya facturado
                {s.pendingLiquidSubscriptions > 0 ? ' y tus suscripciones pendientes' : ''}.
              </Text>
            </View>
          )}

          <View className="gap-2 border-t border-neutral-800 pt-5">
            <BreakdownRow label="Saldo en cuentas líquidas" value={data.liquidBalance} />
            <BreakdownRow
              sign="-"
              label="Suscripciones por cobrar este mes"
              value={s.pendingLiquidSubscriptions}
            />
            <BreakdownRow
              sign="-"
              label="Estados de cuenta facturados sin pagar"
              value={s.unpaidBilledStatements}
            />
            <View className="mt-2 border-t border-neutral-800 pt-2">
              <BreakdownRow sign="=" label="Liquidez segura" value={s.safeLiquidBalance} strong />
            </View>
          </View>
        </View>

        <View className="gap-6 rounded-2xl bg-neutral-800 p-5">
          <View>
            <View className="mb-2 flex-row items-center gap-2">
              <CalendarDays size={16} color={colors.yellow400} />
              <Text className="text-sm text-neutral-400">Presupuesto diario seguro</Text>
            </View>
            {isPeriodActive ? (
              <>
                <Text className="text-3xl font-black text-white">
                  {formatCLP(s.dailySafeLiquidSpend)}
                </Text>
                <Text className="mt-1 text-sm text-neutral-400">
                  por día, durante {s.remainingDaysInMonth}{' '}
                  {s.remainingDaysInMonth === 1 ? 'día restante' : 'días restantes'}
                </Text>
              </>
            ) : (
              <Text className="text-sm text-neutral-400">
                El presupuesto diario solo se calcula para el mes en curso.
              </Text>
            )}
          </View>
          {isPeriodActive && s.dailySafeLiquidSpend === 0 && (
            <Text className="text-xs text-neutral-400">
              {s.safeLiquidBalance <= 0
                ? 'No hay liquidez libre para gastar hoy.'
                : 'Tu liquidez libre es menor que los días que quedan.'}
            </Text>
          )}
        </View>
      </View>

      {/* Crédito: margen saludable */}
      <Card>
        <View>
          <Text className="text-sm font-bold text-neutral-700">Margen de crédito saludable</Text>
          <Text className="mt-0.5 text-xs text-neutral-500">
            Lo que puedes gastar con tarjeta sin que el próximo pago supere tus ingresos del mes.
          </Text>
        </View>

        <Text
          className={`text-3xl font-black ${
            creditMarginNegative ? 'text-red-500' : 'text-neutral-900'
          }`}
        >
          {formatCLP(s.healthyCreditMargin)}
        </Text>

        {!hasIncome && (
          <View className="flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <AlertTriangle size={20} color={colors.amber500} />
            <Text className="flex-1 text-sm text-amber-800">
              Aún no registras ingresos este mes, por eso el margen parte en cero. Agrégalos para
              calcularlo.
            </Text>
          </View>
        )}

        <View className="gap-2 border-t border-neutral-100 pt-4">
          <DetailRow label="Capacidad de pago estimada" value={formatCLP(s.estimatedPaymentCapacity)} />
          <DetailRow label="Facturación del ciclo abierto" value={formatCLP(s.openStatementsTotalBilled)} />
          {isPeriodActive && (
            <DetailRow label="Gasto diario con crédito" value={formatCLP(s.dailyHealthyCreditSpend)} />
          )}
        </View>
      </Card>

      {/* Crédito: salud del cupo */}
      <Card>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-sm font-bold text-neutral-700">Uso de tu crédito</Text>
            <Text className="mt-0.5 text-xs text-neutral-500">{health.hint}</Text>
          </View>
          <View className={`rounded-lg px-3 py-1.5 ${health.badge}`}>
            <Text className={`text-xs font-bold ${health.badgeText}`}>{health.label}</Text>
          </View>
        </View>

        <View>
          <Text className="mb-3 text-3xl font-black text-neutral-900">
            {data.creditUtilizationRatio.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%
          </Text>
          <View
            className="relative h-2.5 w-full rounded-full bg-neutral-100"
            accessibilityRole="progressbar"
            accessibilityLabel="Utilización de crédito"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(utilization) }}
          >
            <View className={`h-2.5 rounded-full ${health.bar}`} style={{ width: `${utilization}%` as const }} />
            {/* Marcas de los umbrales 30% y 60% */}
            <View className="absolute top-0 h-2.5 w-px bg-neutral-300" style={{ left: '30%' }} />
            <View className="absolute top-0 h-2.5 w-px bg-neutral-300" style={{ left: '60%' }} />
          </View>
          <View className="relative mt-1 h-4">
            <Text className="absolute text-[11px] text-neutral-400" style={{ left: '27%' }}>
              30%
            </Text>
            <Text className="absolute text-[11px] text-neutral-400" style={{ left: '57%' }}>
              60%
            </Text>
          </View>
        </View>

        <View className="gap-2 border-t border-neutral-100 pt-4">
          <DetailRow label="Cupo utilizado" value={formatCLP(data.totalCreditUsed)} valueClassName="text-red-500" />
          <DetailRow label="Cupo disponible" value={formatCLP(data.totalAvailableCredit)} />
          <DetailRow label="Cupo total" value={formatCLP(data.totalCreditLimit)} />
        </View>
      </Card>

      {/* Movimiento del mes */}
      <View className="gap-4">
        <StatTile
          icon={TrendingUp}
          iconColor={colors.green600}
          iconBg="bg-green-100"
          label="Ingresos del mes"
          value={data.totalMonthlyIncome}
          valueClassName="text-neutral-800"
        />
        <StatTile
          icon={TrendingDown}
          iconColor={colors.red500}
          iconBg="bg-red-100"
          label="Egresos del mes"
          value={data.totalMonthlyExpenses}
          valueClassName="text-red-500"
        />
        <StatTile
          icon={PiggyBank}
          iconColor={colors.blue600}
          iconBg="bg-blue-100"
          label="Saldo líquido"
          value={data.liquidBalance}
          valueClassName="text-blue-600"
        />
      </View>
    </View>
  );
}
