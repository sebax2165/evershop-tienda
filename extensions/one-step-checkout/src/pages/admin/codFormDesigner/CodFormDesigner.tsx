import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ───────────────────────────────────── */
interface FormField {
  id?: number;
  field_type: string;
  field_label: string;
  field_placeholder: string;
  field_options: string;
  is_required: boolean;
  position: number;
  is_active: boolean;
  is_default?: boolean;
}

interface FormVersion {
  id?: number;
  version_name: string;
  is_active: boolean;
  bg_color: string;
  text_color: string;
  btn_bg_color: string;
  btn_text_color: string;
  btn_hover_color: string;
  border_radius: number;
  custom_css: string;
  header_html: string;
  footer_html: string;
  assigned_products: string;
  assigned_collections: string;
  custom_button_text: string;
  fields: FormField[];
}

/* ─── Default Fields ──────────────────────────── */
const DEFAULT_FIELDS: FormField[] = [
  { field_type: 'text', field_label: 'Nombre Completo', field_placeholder: 'Tu nombre completo', field_options: '', is_required: true, position: 0, is_active: true, is_default: true },
  { field_type: 'tel', field_label: 'Telefono', field_placeholder: '+57 300 000 0000', field_options: '', is_required: true, position: 1, is_active: true, is_default: true },
  { field_type: 'email', field_label: 'Email', field_placeholder: 'correo@ejemplo.com', field_options: '', is_required: false, position: 2, is_active: true, is_default: true },
  { field_type: 'select', field_label: 'Pais', field_placeholder: 'Selecciona tu pais', field_options: 'Colombia,Mexico,Argentina,Chile,Peru,Ecuador', is_required: true, position: 3, is_active: true, is_default: true },
  { field_type: 'select', field_label: 'Departamento / Provincia', field_placeholder: 'Selecciona', field_options: '', is_required: true, position: 4, is_active: true, is_default: true },
  { field_type: 'text', field_label: 'Ciudad', field_placeholder: 'Tu ciudad', field_options: '', is_required: true, position: 5, is_active: true, is_default: true },
  { field_type: 'text', field_label: 'Direccion', field_placeholder: 'Calle, numero, apartamento', field_options: '', is_required: true, position: 6, is_active: true, is_default: true },
  { field_type: 'text', field_label: 'Codigo Postal', field_placeholder: '110111', field_options: '', is_required: false, position: 7, is_active: true, is_default: true },
  { field_type: 'textarea', field_label: 'Notas', field_placeholder: 'Instrucciones adicionales para la entrega', field_options: '', is_required: false, position: 8, is_active: true, is_default: true }
];

const EMPTY_VERSION: FormVersion = {
  version_name: 'Nueva Version',
  is_active: false,
  bg_color: '#ffffff',
  text_color: '#1a1a2e',
  btn_bg_color: '#e63946',
  btn_text_color: '#ffffff',
  btn_hover_color: '#c1121f',
  border_radius: 8,
  custom_css: '',
  header_html: '',
  footer_html: '',
  assigned_products: '',
  assigned_collections: '',
  custom_button_text: 'Completar Pedido',
  fields: [...DEFAULT_FIELDS]
};

/* ─── Field type labels ───────────────────────── */
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  tel: 'Telefono',
  email: 'Email',
  select: 'Selector',
  textarea: 'Area de texto',
  checkbox: 'Casilla',
  number: 'Numero'
};

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: 'Aa',
  tel: '#',
  email: '@',
  select: '[]',
  textarea: '...',
  checkbox: '*',
  number: '1'
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: '#3b82f6',
  tel: '#10b981',
  email: '#f59e0b',
  select: '#8b5cf6',
  textarea: '#6366f1',
  checkbox: '#ec4899',
  number: '#14b8a6'
};

/* ─── Helper: Color Input ─────────────────────── */
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0"
          style={{ appearance: 'none', WebkitAppearance: 'none' }}
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-muted-foreground block mb-1">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm px-2 py-1 rounded border border-border bg-background text-foreground font-mono"
        />
      </div>
    </div>
  );
}

/* ─── Helper: Section Card ────────────────────── */
function SectionCard({ title, icon, children, defaultOpen = true }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

/* ─── Add Field Modal ─────────────────────────── */
function AddFieldModal({ onAdd, onClose }: { onAdd: (f: FormField) => void; onClose: () => void }) {
  const [fieldType, setFieldType] = useState('text');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const handleSubmit = () => {
    if (!fieldLabel.trim()) return;
    onAdd({
      field_type: fieldType,
      field_label: fieldLabel.trim(),
      field_placeholder: fieldPlaceholder.trim(),
      field_options: fieldOptions.trim(),
      is_required: isRequired,
      position: 999,
      is_active: true,
      is_default: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground mb-4">Agregar Campo Personalizado</h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Tipo de campo</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              <option value="text">Texto</option>
              <option value="tel">Telefono</option>
              <option value="email">Email</option>
              <option value="number">Numero</option>
              <option value="select">Selector</option>
              <option value="textarea">Area de texto</option>
              <option value="checkbox">Casilla</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Etiqueta</label>
            <input
              type="text"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Ej: Numero de documento"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Placeholder</label>
            <input
              type="text"
              value={fieldPlaceholder}
              onChange={(e) => setFieldPlaceholder(e.target.value)}
              placeholder="Ej: Ingresa tu documento"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          {fieldType === 'select' && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Opciones (separadas por coma)</label>
              <input
                type="text"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="Opcion 1,Opcion 2,Opcion 3"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addFieldRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="addFieldRequired" className="text-sm text-foreground">Campo obligatorio</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!fieldLabel.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview: Form Field Item ────────────────── */
function PreviewFieldItem({
  field,
  style
}: {
  field: FormField;
  style: FormVersion;
}) {
  const radius = `${style.border_radius}px`;

  if (field.field_type === 'checkbox') {
    return (
      <div className="mb-3">
        <label className="flex items-center gap-2 text-sm" style={{ color: style.text_color }}>
          <input type="checkbox" className="w-4 h-4 rounded" disabled />
          {field.field_label}
          {field.is_required && <span className="text-red-500 text-xs">*</span>}
        </label>
      </div>
    );
  }

  if (field.field_type === 'textarea') {
    return (
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: style.text_color }}>
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <textarea
          placeholder={field.field_placeholder}
          disabled
          rows={2}
          className="w-full px-3 py-2 text-xs border border-gray-200 bg-white/80"
          style={{ borderRadius: radius, color: '#999' }}
        />
      </div>
    );
  }

  if (field.field_type === 'select') {
    return (
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: style.text_color }}>
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          disabled
          className="w-full px-3 py-2 text-xs border border-gray-200 bg-white/80 appearance-none"
          style={{ borderRadius: radius, color: '#999' }}
        >
          <option>{field.field_placeholder || 'Selecciona...'}</option>
        </select>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium mb-1" style={{ color: style.text_color }}>
        {field.field_label}
        {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={field.field_type}
        placeholder={field.field_placeholder}
        disabled
        className="w-full px-3 py-2 text-xs border border-gray-200 bg-white/80"
        style={{ borderRadius: radius, color: '#999' }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */
export default function CodFormDesigner() {
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverBtn, setHoverBtn] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [showNewVersionInput, setShowNewVersionInput] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  const apiUrl = '/admin/cod/form-designer';

  /* ─── Load data ──────────────────────────────── */
  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        const mapped = json.data.map((v: any) => ({
          ...v,
          fields: v.fields && v.fields.length > 0 ? v.fields : [...DEFAULT_FIELDS]
        }));
        setVersions(mapped);
        const activeIdx = mapped.findIndex((v: FormVersion) => v.is_active);
        setCurrentIdx(activeIdx >= 0 ? activeIdx : 0);
      } else {
        setVersions([{ ...EMPTY_VERSION, is_active: true }]);
        setCurrentIdx(0);
      }
    } catch {
      setVersions([{ ...EMPTY_VERSION, is_active: true }]);
      setCurrentIdx(0);
    }
    setLoading(false);
  };

  /* ─── Toast helper ──────────────────────────── */
  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ─── Current version helper ────────────────── */
  const current = versions[currentIdx] || EMPTY_VERSION;

  const updateCurrent = useCallback((patch: Partial<FormVersion>) => {
    setVersions(prev => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], ...patch };
      return copy;
    });
  }, [currentIdx]);

  const updateField = (key: keyof FormVersion, value: any) => {
    updateCurrent({ [key]: value } as any);
  };

  /* ─── Field Operations ──────────────────────── */
  const addField = (f: FormField) => {
    const newFields = [...current.fields, { ...f, position: current.fields.length }];
    updateCurrent({ fields: newFields });
  };

  const removeField = (idx: number) => {
    const f = current.fields[idx];
    if (f.is_default) {
      // toggle active instead of deleting
      const newFields = [...current.fields];
      newFields[idx] = { ...newFields[idx], is_active: !newFields[idx].is_active };
      updateCurrent({ fields: newFields });
      return;
    }
    const newFields = current.fields.filter((_, i) => i !== idx);
    newFields.forEach((field, i) => field.position = i);
    updateCurrent({ fields: newFields });
  };

  const toggleRequired = (idx: number) => {
    const newFields = [...current.fields];
    newFields[idx] = { ...newFields[idx], is_required: !newFields[idx].is_required };
    updateCurrent({ fields: newFields });
  };

  /* ─── Drag & Drop ───────────────────────────── */
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) return;
    const newFields = [...current.fields];
    const [moved] = newFields.splice(dragIdx, 1);
    newFields.splice(dropIdx, 0, moved);
    newFields.forEach((f, i) => f.position = i);
    updateCurrent({ fields: newFields });
    setDragIdx(null);
  };

  /* ─── Save ──────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: current.id || undefined,
        version_name: current.version_name,
        is_active: current.is_active,
        bg_color: current.bg_color,
        text_color: current.text_color,
        btn_bg_color: current.btn_bg_color,
        btn_text_color: current.btn_text_color,
        btn_hover_color: current.btn_hover_color,
        border_radius: current.border_radius,
        custom_css: current.custom_css,
        header_html: current.header_html,
        footer_html: current.footer_html,
        assigned_products: current.assigned_products,
        assigned_collections: current.assigned_collections,
        custom_button_text: current.custom_button_text,
        fields: current.fields.map((f, i) => ({
          field_type: f.field_type,
          field_label: f.field_label,
          field_placeholder: f.field_placeholder,
          field_options: f.field_options,
          is_required: f.is_required,
          position: i,
          is_active: f.is_active
        }))
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast('Version guardada correctamente', 'ok');
        await fetchVersions();
      } else {
        showToast(json.message || 'Error al guardar', 'err');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexion', 'err');
    }
    setSaving(false);
  };

  /* ─── Activate Version ──────────────────────── */
  const activateVersion = async (idx: number) => {
    const v = versions[idx];
    if (!v.id) {
      showToast('Primero guarda la version', 'err');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, is_active: true })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Version activada', 'ok');
        await fetchVersions();
      }
    } catch {
      showToast('Error al activar', 'err');
    }
    setSaving(false);
  };

  /* ─── Create New Version ────────────────────── */
  const createNewVersion = () => {
    if (!newVersionName.trim()) return;
    const newV: FormVersion = { ...EMPTY_VERSION, version_name: newVersionName.trim(), fields: [...DEFAULT_FIELDS] };
    setVersions(prev => [...prev, newV]);
    setCurrentIdx(versions.length);
    setShowNewVersionInput(false);
    setNewVersionName('');
  };

  /* ─── Active fields for preview ─────────────── */
  const activeFields = current.fields.filter(f => f.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando disenador...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ─── Toast ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disenador de Formulario</h1>
          <p className="text-sm text-muted-foreground mt-1">Personaliza la apariencia y campos del formulario de compra COD</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)' }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Guardar Version
            </>
          )}
        </button>
      </div>

      {/* ─── Main Layout ─── */}
      <div className="flex gap-6" style={{ minHeight: '80vh' }}>

        {/* ═══════════════════════════════════════════
            LEFT PANEL - Preview (60%)
            ═══════════════════════════════════════════ */}
        <div className="w-3/5 flex flex-col gap-5">

          {/* Phone Frame Preview */}
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span className="text-sm font-semibold text-foreground">Vista Previa en Vivo</span>
              <span className="ml-auto text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">Movil</span>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center">
              <div
                className="relative w-full max-w-sm shadow-2xl overflow-hidden"
                style={{
                  borderRadius: '32px',
                  border: '8px solid #1a1a2e',
                  background: '#1a1a2e'
                }}
              >
                {/* Notch */}
                <div className="flex justify-center py-1.5" style={{ background: '#1a1a2e' }}>
                  <div className="w-24 h-5 bg-black rounded-full" />
                </div>

                {/* Screen content */}
                <div
                  className="overflow-y-auto"
                  style={{
                    background: current.bg_color,
                    maxHeight: '520px',
                    borderRadius: '0 0 24px 24px'
                  }}
                >
                  {/* Custom header HTML */}
                  {current.header_html && (
                    <div
                      className="px-4 pt-3"
                      dangerouslySetInnerHTML={{ __html: current.header_html }}
                    />
                  )}

                  {/* Product placeholder */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold" style={{ color: current.text_color }}>Nombre del Producto</div>
                        <div className="text-sm font-bold" style={{ color: current.btn_bg_color }}>$99.900</div>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="px-4 pb-3">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: current.text_color, opacity: 0.5 }}>
                      Datos de envio
                    </div>
                    {activeFields.map((field, idx) => (
                      <PreviewFieldItem key={idx} field={field} style={current} />
                    ))}
                  </div>

                  {/* Submit button */}
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      disabled
                      onMouseEnter={() => setHoverBtn(true)}
                      onMouseLeave={() => setHoverBtn(false)}
                      className="w-full py-3 text-sm font-bold shadow-lg transition-all"
                      style={{
                        background: hoverBtn ? current.btn_hover_color : current.btn_bg_color,
                        color: current.btn_text_color,
                        borderRadius: `${current.border_radius}px`
                      }}
                    >
                      {current.custom_button_text || 'Completar Pedido'}
                    </button>
                  </div>

                  {/* Custom footer HTML */}
                  {current.footer_html && (
                    <div
                      className="px-4 pb-4"
                      dangerouslySetInnerHTML={{ __html: current.footer_html }}
                    />
                  )}

                  {/* Custom CSS */}
                  {current.custom_css && (
                    <style dangerouslySetInnerHTML={{ __html: current.custom_css }} />
                  )}
                </div>

                {/* Home bar */}
                <div className="flex justify-center py-2" style={{ background: '#1a1a2e' }}>
                  <div className="w-28 h-1 bg-gray-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Field Manager */}
          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                <span className="text-sm font-semibold text-foreground">Campos del Formulario</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{activeFields.length} activos</span>
              </div>
              <button
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar Campo
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {current.fields.map((field, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-move group ${
                    !field.is_active
                      ? 'opacity-40 border-border bg-muted/30'
                      : dragIdx === idx
                        ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                  </div>

                  {/* Type Icon */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: FIELD_TYPE_COLORS[field.field_type] || '#6b7280' }}
                  >
                    {FIELD_TYPE_ICONS[field.field_type] || '?'}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{field.field_label}</span>
                  </div>

                  {/* Type Badge */}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{
                      background: `${FIELD_TYPE_COLORS[field.field_type] || '#6b7280'}18`,
                      color: FIELD_TYPE_COLORS[field.field_type] || '#6b7280'
                    }}
                  >
                    {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                  </span>

                  {/* Required Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleRequired(idx)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 transition-colors ${
                      field.is_required
                        ? 'bg-red-100 text-red-600'
                        : 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-400'
                    }`}
                    title={field.is_required ? 'Obligatorio - clic para hacer opcional' : 'Opcional - clic para hacer obligatorio'}
                  >
                    {field.is_required ? 'Obligatorio' : 'Opcional'}
                  </button>

                  {/* Delete / Toggle Button */}
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      field.is_default
                        ? field.is_active
                          ? 'text-muted-foreground hover:bg-yellow-50 hover:text-yellow-600'
                          : 'text-muted-foreground hover:bg-green-50 hover:text-green-600'
                        : 'text-muted-foreground hover:bg-red-50 hover:text-red-500'
                    }`}
                    title={field.is_default ? (field.is_active ? 'Ocultar campo' : 'Mostrar campo') : 'Eliminar campo'}
                  >
                    {field.is_default ? (
                      field.is_active ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                      )
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            RIGHT PANEL - Settings (40%)
            ═══════════════════════════════════════════ */}
        <div className="w-2/5 flex flex-col gap-4">

          {/* Colores */}
          <SectionCard title="Colores" icon="">
            <div className="flex flex-col gap-4 mt-2">
              <ColorInput label="Color de fondo" value={current.bg_color} onChange={(v) => updateField('bg_color', v)} />
              <ColorInput label="Color de texto" value={current.text_color} onChange={(v) => updateField('text_color', v)} />
              <ColorInput label="Color del boton" value={current.btn_bg_color} onChange={(v) => updateField('btn_bg_color', v)} />
              <ColorInput label="Texto del boton" value={current.btn_text_color} onChange={(v) => updateField('btn_text_color', v)} />
              <ColorInput label="Hover del boton" value={current.btn_hover_color} onChange={(v) => updateField('btn_hover_color', v)} />
            </div>
          </SectionCard>

          {/* Bordes */}
          <SectionCard title="Bordes y Espaciado" icon="">
            <div className="mt-2">
              <label className="text-xs text-muted-foreground block mb-2">Radio de bordes: <strong>{current.border_radius}px</strong></label>
              <input
                type="range"
                min={0}
                max={20}
                value={current.border_radius}
                onChange={(e) => updateField('border_radius', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>
          </SectionCard>

          {/* Boton de Envio */}
          <SectionCard title="Boton de Envio" icon="">
            <div className="mt-2">
              <label className="text-xs text-muted-foreground block mb-1">Texto del boton</label>
              <input
                type="text"
                value={current.custom_button_text}
                onChange={(e) => updateField('custom_button_text', e.target.value)}
                placeholder="Completar Pedido"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
              {/* Preview mini-button */}
              <div className="mt-3 flex justify-center">
                <div
                  className="px-6 py-2 text-sm font-bold shadow-md"
                  style={{
                    background: current.btn_bg_color,
                    color: current.btn_text_color,
                    borderRadius: `${current.border_radius}px`
                  }}
                >
                  {current.custom_button_text || 'Completar Pedido'}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Encabezado y Pie */}
          <SectionCard title="Encabezado y Pie" icon="" defaultOpen={false}>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">HTML del encabezado</label>
                <textarea
                  value={current.header_html}
                  onChange={(e) => updateField('header_html', e.target.value)}
                  rows={3}
                  placeholder='<div style="text-align:center"><h3>Oferta Especial</h3></div>'
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono resize-y"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">HTML del pie</label>
                <textarea
                  value={current.footer_html}
                  onChange={(e) => updateField('footer_html', e.target.value)}
                  rows={3}
                  placeholder='<p style="text-align:center;font-size:11px">Envio gratis a toda Colombia</p>'
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono resize-y"
                />
              </div>
            </div>
          </SectionCard>

          {/* CSS Personalizado */}
          <SectionCard title="CSS Personalizado" icon="" defaultOpen={false}>
            <div className="mt-2">
              <textarea
                value={current.custom_css}
                onChange={(e) => updateField('custom_css', e.target.value)}
                rows={5}
                placeholder={`.cod-form input:focus {\n  border-color: #e63946;\n  box-shadow: 0 0 0 2px rgba(230,57,70,0.2);\n}`}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono resize-y"
              />
            </div>
          </SectionCard>

          {/* Asignacion */}
          <SectionCard title="Asignacion" icon="" defaultOpen={false}>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Productos asignados (IDs separados por coma)</label>
                <input
                  type="text"
                  value={current.assigned_products}
                  onChange={(e) => updateField('assigned_products', e.target.value)}
                  placeholder="1,2,3"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Colecciones asignadas (IDs separados por coma)</label>
                <input
                  type="text"
                  value={current.assigned_collections}
                  onChange={(e) => updateField('assigned_collections', e.target.value)}
                  placeholder="1,2,3"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
            </div>
          </SectionCard>

          {/* Versiones */}
          <SectionCard title="Versiones del Formulario" icon="">
            <div className="flex flex-col gap-2 mt-2">
              {versions.map((v, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    idx === currentIdx
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setCurrentIdx(idx)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${v.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-medium text-foreground truncate">{v.version_name}</span>
                    {v.is_active && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Activa</span>
                    )}
                  </div>
                  {!v.is_active && v.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); activateVersion(idx); }}
                      className="text-xs text-primary hover:underline flex-shrink-0"
                    >
                      Activar
                    </button>
                  )}
                </div>
              ))}

              {/* Create New Version */}
              {showNewVersionInput ? (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="Nombre de la version"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && createNewVersion()}
                  />
                  <button
                    onClick={createNewVersion}
                    disabled={!newVersionName.trim()}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => { setShowNewVersionInput(false); setNewVersionName(''); }}
                    className="px-3 py-2 rounded-lg border border-border text-foreground text-xs hover:bg-muted"
                  >
                    X
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewVersionInput(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Nueva Version
                </button>
              )}
            </div>
          </SectionCard>

          {/* Version Name */}
          <div className="border border-border rounded-xl bg-card p-4">
            <label className="text-xs text-muted-foreground block mb-1">Nombre de esta version</label>
            <input
              type="text"
              value={current.version_name}
              onChange={(e) => updateField('version_name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* ─── Add Field Modal ─── */}
      {showAddField && (
        <AddFieldModal
          onAdd={addField}
          onClose={() => setShowAddField(false)}
        />
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
