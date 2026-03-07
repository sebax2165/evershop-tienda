import React, { useEffect, useState, useCallback } from 'react';

/* ─── Tipos ─── */
interface BlockedUser {
  block_id: number;
  block_type: string;
  block_value: string;
  reason: string | null;
  created_at: string;
}

interface ConditionalRule {
  rule_id: number;
  uuid: string;
  rule_type: string;
  operator: string;
  conditions: any;
  priority: number;
  enabled: boolean;
  created_at: string;
}

interface BlockForm {
  block_type: string;
  block_value: string;
  reason: string;
}

interface RuleForm {
  rule_name: string;
  rule_type: string;
  operator: string;
  conditions: string;
  priority: string;
  enabled: boolean;
}

const defaultBlockForm: BlockForm = {
  block_type: 'ip',
  block_value: '',
  reason: ''
};

const defaultRuleForm: RuleForm = {
  rule_name: '',
  rule_type: 'order_total_range',
  operator: 'block',
  conditions: '{}',
  priority: '0',
  enabled: true
};

const BLOCK_TABS = [
  { key: 'ip', label: 'IP' },
  { key: 'phone', label: 'Telefono' },
  { key: 'email', label: 'Email' }
];

const RULE_TYPES = [
  { value: 'order_total_range', label: 'Rango de Total de Orden' },
  { value: 'country_whitelist', label: 'Lista Blanca de Paises' },
  { value: 'product_blacklist', label: 'Lista Negra de Productos' },
  { value: 'shipping_type', label: 'Tipo de Envio' }
];

const OPERATORS = [
  { value: 'show', label: 'Mostrar' },
  { value: 'block', label: 'Bloquear' },
  { value: 'allow', label: 'Permitir' }
];

export default function CodFraudRules() {
  /* ─── Usuarios bloqueados ─── */
  const [activeTab, setActiveTab] = useState('ip');
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockForm>(defaultBlockForm);
  const [blockSaving, setBlockSaving] = useState(false);

  /* ─── Reglas condicionales ─── */
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleForm>(defaultRuleForm);
  const [ruleSaving, setRuleSaving] = useState(false);

  /* ─── Fetch Bloqueados ─── */
  const fetchBlocked = useCallback(async () => {
    setBlockedLoading(true);
    setBlockedError(null);
    try {
      const res = await fetch(
        `/api/admin/cod/blocked-users?block_type=${activeTab}`,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      const json = await res.json();
      if (json.success) {
        setBlocked(json.data || []);
      } else {
        setBlockedError(json.message || 'Error al cargar');
      }
    } catch (e: any) {
      setBlockedError(e.message);
    } finally {
      setBlockedLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  /* ─── Fetch Reglas ─── */
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch(`/api/admin/cod/conditional-rules`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setRules(json.data || []);
      } else {
        setRulesError(json.message || 'Error al cargar reglas');
      }
    } catch (e: any) {
      setRulesError(e.message);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  /* ─── Bloquear usuario ─── */
  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockSaving(true);
    try {
      const res = await fetch(`/api/admin/cod/blocked-users`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_type: blockForm.block_type,
          block_value: blockForm.block_value,
          reason: blockForm.reason || null
        })
      });
      const json = await res.json();
      if (json.success) {
        setBlockForm(defaultBlockForm);
        setShowBlockForm(false);
        fetchBlocked();
      } else {
        setBlockedError(json.message || 'Error al bloquear');
      }
    } catch (e: any) {
      setBlockedError(e.message);
    } finally {
      setBlockSaving(false);
    }
  };

  /* ─── Desbloquear usuario ─── */
  const handleUnblock = async (blockId: number) => {
    if (!confirm('Seguro que deseas desbloquear este usuario?')) return;
    try {
      const res = await fetch(
        `/api/admin/cod/blocked-users/${blockId}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchBlocked();
      } else {
        setBlockedError(json.message || 'Error al desbloquear');
      }
    } catch (e: any) {
      setBlockedError(e.message);
    }
  };

  /* ─── Crear regla ─── */
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleSaving(true);
    try {
      let parsedConditions;
      try {
        parsedConditions = JSON.parse(ruleForm.conditions);
      } catch {
        setRulesError('El JSON de condiciones no es valido');
        setRuleSaving(false);
        return;
      }
      const res = await fetch(`/api/admin/cod/conditional-rules`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_name: ruleForm.rule_name || null,
          rule_type: ruleForm.rule_type,
          operator: ruleForm.operator,
          conditions: parsedConditions,
          priority: parseInt(ruleForm.priority, 10),
          enabled: ruleForm.enabled
        })
      });
      const json = await res.json();
      if (json.success) {
        setRuleForm(defaultRuleForm);
        setShowRuleForm(false);
        fetchRules();
      } else {
        setRulesError(json.message || 'Error al crear regla');
      }
    } catch (e: any) {
      setRulesError(e.message);
    } finally {
      setRuleSaving(false);
    }
  };

  /* ─── Eliminar regla ─── */
  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Seguro que deseas eliminar esta regla?')) return;
    try {
      const res = await fetch(
        `/api/admin/cod/conditional-rules/${ruleId}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchRules();
      } else {
        setRulesError(json.message || 'Error al eliminar regla');
      }
    } catch (e: any) {
      setRulesError(e.message);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const getRuleTypeLabel = (type: string): string => {
    return (
      RULE_TYPES.find((r) => r.value === type)?.label || type
    );
  };

  const getOperatorLabel = (op: string): string => {
    return OPERATORS.find((o) => o.value === op)?.label || op;
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Prevencion de Fraude
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona usuarios bloqueados y reglas condicionales
        </p>
      </div>

      {/* ═══════════ SECCION A: Usuarios Bloqueados ═══════════ */}
      <div className="bg-background border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Usuarios Bloqueados
          </h2>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
            {BLOCK_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {blockedError && (
          <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
            {blockedError}
            <button
              onClick={() => setBlockedError(null)}
              className="ml-3 underline text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tabla bloqueados */}
        <div className="p-6">
          {blockedLoading ? (
            <p className="text-muted-foreground text-center py-4">
              Cargando...
            </p>
          ) : blocked.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay usuarios bloqueados por{' '}
              {activeTab === 'ip'
                ? 'IP'
                : activeTab === 'phone'
                  ? 'telefono'
                  : 'email'}
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Valor
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Razon
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((b) => (
                    <tr
                      key={b.block_id}
                      className="border-b border-border hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          {b.block_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground font-mono text-xs">
                        {b.block_value}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {b.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(b.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleUnblock(b.block_id)}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Desbloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formulario bloquear */}
          <div className="mt-4">
            {!showBlockForm ? (
              <button
                type="button"
                onClick={() => {
                  setBlockForm({ ...defaultBlockForm, block_type: activeTab });
                  setShowBlockForm(true);
                }}
                className="px-5 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + Bloquear Usuario
              </button>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-muted/10">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Bloquear Usuario
                </h4>
                <form onSubmit={handleBlock} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Tipo
                      </label>
                      <select
                        value={blockForm.block_type}
                        onChange={(e) =>
                          setBlockForm({
                            ...blockForm,
                            block_type: e.target.value
                          })
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ip">IP</option>
                        <option value="phone">Telefono</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Valor
                      </label>
                      <input
                        type="text"
                        value={blockForm.block_value}
                        onChange={(e) =>
                          setBlockForm({
                            ...blockForm,
                            block_value: e.target.value
                          })
                        }
                        required
                        placeholder={
                          blockForm.block_type === 'ip'
                            ? '192.168.1.1'
                            : blockForm.block_type === 'phone'
                              ? '+573001234567'
                              : 'correo@ejemplo.com'
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Razon
                      </label>
                      <input
                        type="text"
                        value={blockForm.reason}
                        onChange={(e) =>
                          setBlockForm({
                            ...blockForm,
                            reason: e.target.value
                          })
                        }
                        placeholder="Razon del bloqueo"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={blockSaving}
                      className="px-5 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {blockSaving ? 'Bloqueando...' : 'Bloquear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBlockForm(false);
                        setBlockForm(defaultBlockForm);
                      }}
                      className="px-5 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ SECCION B: Reglas Condicionales ═══════════ */}
      <div className="bg-background border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Reglas Condicionales
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Define reglas avanzadas para controlar el acceso al formulario COD
          </p>
        </div>

        {rulesError && (
          <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
            {rulesError}
            <button
              onClick={() => setRulesError(null)}
              className="ml-3 underline text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="p-6">
          {rulesLoading ? (
            <p className="text-muted-foreground text-center py-4">
              Cargando reglas...
            </p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay reglas condicionales configuradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Operador
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Condiciones
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Prioridad
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Activo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr
                      key={r.rule_id}
                      className="border-b border-border hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {getRuleTypeLabel(r.rule_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            r.operator === 'block'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : r.operator === 'allow'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {getOperatorLabel(r.operator)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded max-w-xs block truncate">
                          {typeof r.conditions === 'object'
                            ? JSON.stringify(r.conditions)
                            : r.conditions}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {r.priority}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            r.enabled ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="ml-2 text-foreground">
                          {r.enabled ? 'Si' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.rule_id)}
                          className="text-destructive hover:underline text-xs font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formulario nueva regla */}
          <div className="mt-4">
            {!showRuleForm ? (
              <button
                type="button"
                onClick={() => setShowRuleForm(true)}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + Nueva Regla
              </button>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-muted/10">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Nueva Regla Condicional
                </h4>
                <form onSubmit={handleCreateRule} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={ruleForm.rule_name}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            rule_name: e.target.value
                          })
                        }
                        placeholder="Nombre de la regla"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Tipo
                      </label>
                      <select
                        value={ruleForm.rule_type}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            rule_type: e.target.value
                          })
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {RULE_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Operador
                      </label>
                      <select
                        value={ruleForm.operator}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            operator: e.target.value
                          })
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Prioridad
                      </label>
                      <input
                        type="number"
                        value={ruleForm.priority}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            priority: e.target.value
                          })
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleForm.enabled}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              enabled: e.target.checked
                            })
                          }
                          className="rounded border-border"
                        />
                        Activo
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Condiciones (JSON)
                    </label>
                    <textarea
                      value={ruleForm.conditions}
                      onChange={(e) =>
                        setRuleForm({
                          ...ruleForm,
                          conditions: e.target.value
                        })
                      }
                      rows={4}
                      required
                      placeholder='{"min": 50000, "max": 200000}'
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ejemplo para rango de total:{' '}
                      {'{"min": 50000, "max": 200000}'} | Para lista de paises:{' '}
                      {'{"countries": ["CO", "MX"]}'} | Para productos:{' '}
                      {'{"product_ids": [1, 2, 3]}'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={ruleSaving}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {ruleSaving ? 'Guardando...' : 'Crear Regla'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRuleForm(false);
                        setRuleForm(defaultRuleForm);
                      }}
                      className="px-5 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
