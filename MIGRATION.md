# Migración desde EcoNekoWeb

Este archivo registra hasta qué versión de **EcoNekoWeb** (React + Vite) está migrada la app.
Al migrar nuevos cambios de la web, revisa los commits posteriores a la última entrada y agrega una nueva.

| Fecha | Versión de la web | Qué se migró |
|---|---|---|
| 2026-11-12 | `a5c19f4` (Update: chatbot) | Migración inicial: auth, dashboard, egresos, tarjetas y chat NekoAI |
| 2026-11-12 | `a5c19f4` + cambios "Navbar común, dashboard rediseñado, tarjetas agrupadas por tipo y sección de Ingresos" (aún sin commit en el repo web al momento de migrar) | Pestaña Ingresos, dashboard con métricas arriba y franja de liquidez compacta, tarjetas agrupadas por tipo de cuenta, encabezados de página con sus propias acciones |

## Equivalencias principales

- `src/pages/*Page.tsx` (web) → `src/screens/*Screen.tsx` (app)
- `components/layout/AppLayout.tsx` (navbar web) → barra de pestañas en `app/(app)/_layout.tsx`
- `components/layout/PageHeader.tsx` → `src/components/ui/PageHeader.tsx`
- `src/services`, `src/lib`, `src/types`, `src/hooks` → casi idénticos en ambos proyectos
