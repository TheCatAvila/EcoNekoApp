import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  AlertTriangle,
  CalendarDays,
  PiggyBank,
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

/* ───────────── Piezas ───────────── */

function StatTile({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  valueClass = 'text-neutral-900',
  hint,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-center gap-2">
        <View className={`h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon size={16} color={iconColor} />
        </View>
        <Text numberOfLines={1} className="flex-1 text-xs font-bold text-neutral-500">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xl font-black ${valueClass}`}>
        {value}
      </Text>
      {!!hint && (
        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-neutral-400">
          {hint}
        </Text>
      )}
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <View className="gap-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
      {children}
    </View>
  );
}

function Row({ label, value, valueClass = 'text-neutral-900' }: { label: string; value: string; valueClass?: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="flex-1 text-sm text-neutral-500">{label}</Text>
      <Text className={`text-sm font-bold ${valueClass}`}>{value}</Text>
    </View>
  );
}

function StripItem({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs text-neutral-400">{label}</Text>
      <Text className="text-sm font-bold text-white">{formatCLP(value)}</Text>
    </View>
  );
}

/* ───────────── Dashboard ───────────── */

export default function DashboardHome({ data }: DashboardHomeProps) {
  const { safeToSpend: s } = data;
  const health = HEALTH_STYLES[data.creditHealthSemaphore] ?? HEALTH_STYLES.Healthy;

  const isPeriodActive = s.remainingDaysInMonth > 0; // el backend devuelve 0 si no es el mes en curso
  const hasIncome = data.totalMonthlyIncome > 0;
  const creditMarginNegative = s.healthyCreditMargin < 0;
  const utilization = Math.min(Math.max(data.creditUtilizationRatio, 0), 100);
  const monthBalance = data.totalMonthlyIncome - data.totalMonthlyExpenses;

  return (
    <View className="gap-4" accessibilityLabel="Resumen financiero">
      {/* 1. Movimiento del mes: lo primero que se ve */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            icon={TrendingUp}
            iconColor={colors.green600}
            iconBg="bg-green-100"
            label="Ingresos del mes"
            value={formatCLP(data.totalMonthlyIncome)}
          />
          <StatTile
            icon={TrendingDown}
            iconColor={colors.red500}
            iconBg="bg-red-100"
            label="Egresos del mes"
            value={formatCLP(data.totalMonthlyExpenses)}
            valueClass="text-red-500"
            hint={
              hasIncome
                ? `Balance: ${monthBalance >= 0 ? '+' : ''}${formatCLP(monthBalance)}`
                : undefined
            }
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            icon={PiggyBank}
            iconColor={colors.blue600}
            iconBg="bg-blue-100"
            label="Saldo líquido"
            value={formatCLP(data.liquidBalance)}
            valueClass="text-blue-600"
          />
          <StatTile
            icon={CalendarDays}
            iconColor="#a16207"
            iconBg="bg-yellow-100"
            label="Puedes gastar hoy"
            value={isPeriodActive ? formatCLP(s.dailySafeLiquidSpend) : '—'}
            hint={
              isPeriodActive
                ? `${s.remainingDaysInMonth} ${s.remainingDaysInMonth === 1 ? 'día restante' : 'días restantes'}`
                : 'Solo para el mes en curso'
            }
          />
        </View>
      </View>

      {/* 2. Liquidez segura: franja compacta */}
      <View className="gap-3 rounded-3xl bg-neutral-900 p-5">
        <View>
          <View className="mb-1 flex-row items-center gap-2">
            <ShieldCheck size={16} color={colors.green400} />
            <Text className="text-xs text-neutral-400">Liquidez disponible segura</Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className={`text-3xl font-black tracking-tight ${
              s.isInLiquidityDeficit ? 'text-red-400' : 'text-white'
            }`}
          >
            {formatCLP(s.safeLiquidBalance)}
          </Text>
        </View>

        <View className="gap-1.5 border-t border-neutral-800 pt-3">
          <StripItem label="Saldo en cuentas" value={data.liquidBalance} />
          <StripItem label="− Suscripciones por cobrar" value={s.pendingLiquidSubscriptions} />
          <StripItem label="− Facturado sin pagar" value={s.unpaidBilledStatements} />
        </View>

        {s.isInLiquidityDeficit && (
          <View className="flex-row items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <AlertTriangle size={16} color={colors.red400} />
            <Text className="flex-1 text-xs text-red-200">
              Tus compromisos superan tu saldo líquido por{' '}
              <Text className="font-bold text-white">{formatCLP(Math.abs(s.safeLiquidBalance))}</Text>.
              Necesitas ese monto para cubrir lo ya facturado
              {s.pendingLiquidSubscriptions > 0 ? ' y tus suscripciones pendientes' : ''}.
            </Text>
          </View>
        )}
      </View>

      {/* 3. Crédito */}
      <Card>
        <View>
          <Text className="text-sm font-bold text-neutral-700">Margen de crédito saludable</Text>
          <Text className="mt-0.5 text-xs text-neutral-500">
            Lo que puedes gastar con tarjeta sin que el próximo pago supere tus ingresos del mes.
          </Text>
        </View>

        <Text className={`text-3xl font-black ${creditMarginNegative ? 'text-red-500' : 'text-neutral-900'}`}>
          {formatCLP(s.healthyCreditMargin)}
        </Text>

        {!hasIncome && (
          <View className="flex-row items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <AlertTriangle size={16} color={colors.amber500} />
            <Text className="flex-1 text-xs text-amber-800">
              Aún no registras ingresos este mes, por eso el margen parte en cero. Agrégalos para
              calcularlo.
            </Text>
          </View>
        )}

        <View className="gap-2 border-t border-neutral-100 pt-4">
          <Row label="Capacidad de pago estimada" value={formatCLP(s.estimatedPaymentCapacity)} />
          <Row label="Facturación del ciclo abierto" value={formatCLP(s.openStatementsTotalBilled)} />
          {isPeriodActive && (
            <Row label="Gasto diario con crédito" value={formatCLP(s.dailyHealthyCreditSpend)} />
          )}
        </View>
      </Card>

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
          <Row label="Cupo utilizado" value={formatCLP(data.totalCreditUsed)} valueClass="text-red-500" />
          <Row label="Cupo disponible" value={formatCLP(data.totalAvailableCredit)} />
          <Row label="Cupo total" value={formatCLP(data.totalCreditLimit)} />
        </View>
      </Card>
    </View>
  );
}
