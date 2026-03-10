import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, QrCode, Pencil, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Table, QRData } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import QRDesigner from '@/components/qr/QRDesigner';

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  free: { bg: 'bg-tonalli-black-card', border: 'border-light-border', text: 'text-silver-dark', label: 'Libre' },
  occupied: { bg: 'bg-gold/[0.08]', border: 'border-gold', text: 'text-gold', label: 'Ocupada' },
  ordering: { bg: 'bg-table-jade', border: 'border-jade', text: 'text-jade-light', label: 'Pidiendo' },
  bill: { bg: 'bg-status-preparing', border: 'border-silver', text: 'text-silver', label: 'Cuenta' },
  reserved: { bg: 'bg-red-500/[0.08]', border: 'border-red-500/30', text: 'text-red-400', label: 'Reservada' },
};

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Table | null>(null);
  const [qrMenuUrl, setQrMenuUrl] = useState('');
  const [newNum, setNewNum] = useState('');
  const [newCap, setNewCap] = useState('4');
  const [editNum, setEditNum] = useState('');
  const [editCap, setEditCap] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const inv = () => queryClient.invalidateQueries({ queryKey: ['tables'] });

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => apiFetch<Table[]>('/tables', { auth: true }),
    refetchInterval: 15000,
  });

  const addTable = useMutation({
    mutationFn: (d: { number: number; capacity: number }) => apiFetch('/tables', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowAdd(false); setNewNum(''); setNewCap('4'); toast.success('Mesa creada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editTable = useMutation({
    mutationFn: ({ id, ...d }: { id: string; number: number; capacity: number }) => apiFetch(`/tables/${id}`, { method: 'PUT', body: d, auth: true }),
    onSuccess: () => { inv(); setShowEdit(false); toast.success('Mesa actualizada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/tables/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => inv(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => apiFetch(`/tables/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => { inv(); setDeleteId(null); setShowDetail(false); toast.success('Mesa eliminada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openQR = async (table: Table) => {
    setSelected(table);
    try {
      const data = await apiFetch<QRData>(`/tables/${table.id}/qr`, { auth: true });
      setQrMenuUrl(data.menuUrl);
      setShowQR(true);
    } catch {
      toast.error('No se pudo obtener datos del QR');
    }
  };

  const openEdit = (t: Table) => {
    setSelected(t);
    setEditNum(String(t.number));
    setEditCap(String(t.capacity));
    setEditNotes(t.notes || '');
    setShowDetail(false);
    setShowEdit(true);
  };

  const sorted = (tables ?? []).sort((a, b) => a.number - b.number);
  const free = sorted.filter(t => t.status === 'free').length;
  const occupied = sorted.length - free;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-white text-2xl font-light tracking-wide">Mesas</h2>
          <p className="text-silver-muted text-xs mt-0.5">{free} libres · {occupied} ocupadas</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 rounded-full border border-gold flex items-center justify-center text-gold hover:bg-gold/10 transition-colors" aria-label="Agregar mesa">
          <Plus size={16} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 py-2.5 mb-1 border-b border-light-border">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${v.text.replace('text-', 'bg-')}`} />
            <span className="text-silver-muted text-[11px]">{v.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-2">🪑</p>
          <p className="text-white font-medium">Sin mesas configuradas</p>
          <p className="text-silver-muted text-sm">Agrega tu primera mesa para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4">
          {sorted.map(t => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.free;
            return (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setShowDetail(true); }}
                className={`aspect-square ${cfg.bg} border-[1.5px] ${cfg.border} rounded-2xl flex flex-col items-center justify-center gap-1 hover:opacity-80 transition-opacity relative`}
              >
                {t.status === 'ordering' && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-jade animate-pulse" />
                )}
                <span className={`text-2xl font-semibold ${cfg.text}`}>{t.number}</span>
                <span className={`text-[10px] font-medium uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users size={10} className="text-silver-dark" />
                  <span className="text-silver-dark text-[10px]">{t.capacity}</span>
                  {t.notes && <MessageSquare size={10} className="text-gold ml-1" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Nueva Mesa" onClose={() => setShowAdd(false)}>
          <InputField label="NÚMERO DE MESA" placeholder="Ej: 1" value={newNum} onChange={setNewNum} type="number" required />
          <InputField label="CAPACIDAD" placeholder="Ej: 4" value={newCap} onChange={setNewCap} type="number" />
          <GoldButton loading={addTable.isPending} disabled={!newNum.trim()} onClick={() => addTable.mutate({ number: parseInt(newNum) || 1, capacity: parseInt(newCap) || 4 })}>
            Crear Mesa
          </GoldButton>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <Modal title={`Editar Mesa ${selected.number}`} onClose={() => setShowEdit(false)}>
          <InputField label="NÚMERO" value={editNum} onChange={setEditNum} type="number" required />
          <InputField label="CAPACIDAD" value={editCap} onChange={setEditCap} type="number" />
          <InputField label="NOTAS" value={editNotes} onChange={setEditNotes} placeholder="Ej: Junto a ventana, cumpleaños, alergia..." />
          <GoldButton loading={editTable.isPending} disabled={!editNum.trim()} onClick={() => editTable.mutate({ id: selected.id, number: parseInt(editNum) || 1, capacity: parseInt(editCap) || 4, notes: editNotes.trim() || null } as { id: string; number: number; capacity: number })}>
            Guardar
          </GoldButton>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <Modal title={`Mesa ${selected.number}`} onClose={() => setShowDetail(false)}>
          <div className="flex justify-between items-center">
            <span className="text-silver-muted text-[13px]">Estado</span>
            <span className={`text-[15px] font-medium ${STATUS_CONFIG[selected.status]?.text}`}>
              {STATUS_CONFIG[selected.status]?.label}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-silver-muted text-[13px]">Capacidad</span>
            <span className="text-white text-[15px] font-medium">{selected.capacity} personas</span>
          </div>

          {selected.notes && (
            <div className="bg-gold/5 border border-gold/15 rounded-lg px-3 py-2">
              <div className="flex items-start gap-2">
                <MessageSquare size={12} className="text-gold mt-0.5 shrink-0" />
                <p className="text-silver text-xs">{selected.notes}</p>
              </div>
            </div>
          )}

          <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mt-2">CAMBIAR ESTADO</p>
          <div className="flex flex-wrap gap-2">
            {(['free', 'occupied', 'ordering', 'bill', 'reserved'] as const).map(s => {
              const cfg = STATUS_CONFIG[s];
              const active = selected.status === s;
              return (
                <button
                  key={s}
                  disabled={active}
                  onClick={() => { updateStatus.mutate({ id: selected.id, status: s }); setShowDetail(false); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${
                    active ? `${cfg.border} ${cfg.bg} ${cfg.text}` : 'border-light-border bg-tonalli-black-card text-silver-dark hover:text-silver'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              onClick={() => openEdit(selected)}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
            <button
              onClick={() => { setShowDetail(false); openQR(selected); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl border border-gold text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
            >
              <QrCode size={16} />
              Ver QR
            </button>
            <button
              onClick={() => { setShowDetail(false); setDeleteId(selected.id); }}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}

      {/* QR Designer */}
      {showQR && selected && (
        <QRDesigner
          tableId={selected.id}
          tableNumber={selected.number}
          menuUrl={qrMenuUrl}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar Mesa"
        message="¿Estás seguro de eliminar esta mesa? Se perderá el QR asociado."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteTable.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteTable.isPending}
      />
    </div>
  );
}
