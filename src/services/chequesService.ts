import { request } from '../lib/apiClient';

/*
 * Cheques emitidos y recibidos.
 * - Emitido pendiente: descuenta liquidez segura (ya está comprometido).
 * - Emitido cobrado: el backend registra el egreso en la cuenta corriente.
 * - Recibido pendiente: NO suma liquidez hasta depositarlo.
 * - Recibido depositado: el backend registra el ingreso en la cuenta.
 *
 * Endpoints (ChequesController):
 *   GET    /Cheques/me[?direction=Issued|Received&status=Pending|...]
 *   POST   /Cheques                 → 409 si el número ya existe en esa cuenta
 *   PATCH  /Cheques/{id}/status     → { status: 2|3|4, statusDate }
 *   DELETE /Cheques/{id}            → si estaba cobrado, revierte el movimiento
 */

export type ChequeDirection = 'Issued' | 'Received';
export type ChequeStatus = 'Pending' | 'Cashed' | 'Cancelled' | 'Bounced';

export const CHEQUE_DIRECTION_CODE: Record<ChequeDirection, number> = { Issued: 1, Received: 2 };
export const CHEQUE_STATUS_CODE: Record<ChequeStatus, number> = {
  Pending: 1,
  Cashed: 2,
  Cancelled: 3,
  Bounced: 4,
};

export interface Cheque {
  id: number;
  directionName: ChequeDirection;
  number: string;
  accountId: number;
  accountName?: string | null;
  /** Banco del cheque (útil en los recibidos, que son de otro banco). */
  drawerBankName?: string | null;
  /** A quién se le emitió o quién lo entregó. */
  counterpartName: string;
  amount: number;
  /** 'YYYY-MM-DD' */
  issueDate: string;
  /** Fecha desde la que se puede cobrar/depositar ('YYYY-MM-DD'). */
  cashDate: string;
  statusName: ChequeStatus;
  statusDate?: string | null;
  description?: string | null;
  directionCode?: number;
  statusCode?: number;
  /** Pendiente y con fecha de cobro ya cumplida. */
  isCashable?: boolean;
}

export interface NewCheque {
  direction: number;
  number: string;
  accountId: number;
  drawerBankName: string | null;
  counterpartName: string;
  amount: number;
  issueDate: string;
  cashDate: string;
  description: string | null;
}

export const getCheques = () => request<Cheque[]>('/Cheques/me', { auth: true });

export const createCheque = (payload: NewCheque) =>
  request<Cheque>('/Cheques', { method: 'POST', body: payload, auth: true });

export const updateChequeStatus = (id: number, status: ChequeStatus, statusDate: string) =>
  request<Cheque>(`/Cheques/${id}/status`, {
    method: 'PATCH',
    body: { status: CHEQUE_STATUS_CODE[status], statusDate },
    auth: true,
  });

export const deleteCheque = (id: number) =>
  request<null>(`/Cheques/${id}`, { method: 'DELETE', auth: true });
