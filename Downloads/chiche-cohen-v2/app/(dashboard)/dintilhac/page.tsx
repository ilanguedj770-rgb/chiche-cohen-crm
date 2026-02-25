'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calculator, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react'

// Barème DFP par âge (CA Aix-en-Provence)
const BAREME_DFP: Record<number, number> = {
  20: 4500, 25: 4200, 30: 3900, 35: 3600, 40: 3300, 45: 3000,
  50: 2700, 55: 2400, 60: 2100, 65: 1800, 70: 1500, 75: 1200, 80: 900
}

// Table de capitalisation TD 20-22 taux 0%
const COEFF_CAP: Record<number, number> = {
  20: 53.94, 25: 49.62, 30: 45.26, 35: 40.86, 40: 36.42, 45: 31.95,
  50: 27.47, 55: 23.02, 60: 18.66, 65: 14.51, 70: 10.73, 75: 7.46, 80: 4.82
}

// Fourchettes Pretium Doloris (CA Aix)
const PD_FOURCHETTES: Record<number, [number, number]> = {
  1: [1000, 2000], 2: [2000, 4000], 3: [4000, 8000],
  4: [8000, 15000], 5: [15000, 25000], 6: [25000, 40000], 7: [40000, 60000]
}

// Fourchettes Préjudice Esthétique
const PE_FOURCHETTES: Record<number, [number, number]> = {
  1: [500, 1500], 2: [1500, 4000], 3: [4000, 8000],
  4: [8000, 15000], 5: [15000, 25000], 6: [25000, 40000], 7: [40000, 60000]
}

function getBareme(age: number, table: Record<number, number>): number {
  const ages = Object.keys(table).map(Number).sort((a, b) => b - a)
  for (const a of ages) { if (age >= a) return table[a] }
  return table[20]
}

function eur(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

interface C {
  age: number
  dft_journalier: number
  dft_total: number
  dft_75: number
  dft_50: number
  dft_25: number
  taux_dfp: number
  qd: number
  pe: number
  pgpa: number
  pgpf_rente: number
  incidence_pro: number
  tp_h_j_temp: number
  tp_jours_temp: number
  tp_h_j_perm: number
  tp_tarif: number
  frais_actuels: number
  frais_futurs: number
  agrement: number
  sexuel: number
  etablissement: number
  offre: number
}

const DEF: C = {
  age: 35, dft_journalier: 31, dft_total: 0, dft_75: 0, dft_50: 0, dft_25: 0,
  taux_dfp: 0, qd: 0, pe: 0, pgpa: 0, pgpf_rente: 0, incidence_pro: 0,
  tp_h_j_temp: 0, tp_jours_temp: 0, tp_h_j_perm: 0, tp_tarif: 22,
  frais_actuels: 0, frais_futurs: 0, agrement: 0, sexuel: 0, etablissement: 0, offre: 0,
}

export default function DintilhacPage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [dossierId, setDossierId] = useState('')
  const [c, setC] = useState<C>(DEF)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState({ dft: true, dfp: true, suf: true, pro: false, tp: false, autres: false })

  useEffect(() => {
    supabase.from('dossiers')
      .select('id, reference, client:clients(id, nom, prenom, date_naissance, revenus_annuels_nets), expertises(taux_dfp, quantum_doloris, prejudice_esthetique, duree_itt_jours)')
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setDossiers(data) })
  }, [])

  const set = (f: keyof C, v: any) => setC(prev => ({ ...prev, [f]: isNaN(Number(v)) ? v : Number(v) }))
  const tog = (f: keyof typeof open) => setOpen(prev => ({ ...prev, [f]: !prev[f] }))

  const charger = (id: string) => {
    setDossierId(id)
    if (!id) return
    const d = dossiers.find(x => x.id === id)
    if (!d) return
    const exp = d.expertises?.[0]
    const cl = d.client
    const age = cl?.date_naissance
      ? Math.floor((Date.now() - new Date(cl.date_naissance).getTime()) / (365.25 * 86400000))
      : 35
    const dfp = exp?.taux_dfp || 0
    const rev = cl?.revenus_annuels_nets || 0
    setC(prev => ({
      ...prev,
      age,
      taux_dfp: dfp,
      qd: exp?.quantum_doloris || 0,
      pe: exp?.prejudice_esthetique || 0,
      dft_total: exp?.duree_itt_jours || 0,
      pgpf_rente: rev && dfp ? Math.round(rev * dfp / 100) : 0,
    }))
  }

  // Calculs
  const dft = c.dft_total * c.dft_journalier + c.dft_75 * c.dft_journalier * 0.75 + c.dft_50 * c.dft_journalier * 0.5 + c.dft_25 * c.dft_journalier * 0.25
  const pointDFP = getBareme(c.age, BAREME_DFP)
  const dfp = c.taux_dfp * pointDFP
  const pdMin = c.qd > 0 ? PD_FOURCHETTES[c.qd][0] : 0
  const pdMax = c.qd > 0 ? PD_FOURCHETTES[c.qd][1] : 0
  const peMin = c.pe > 0 ? PE_FOURCHETTES[c.pe][0] : 0
  const peMax = c.pe > 0 ? PE_FOURCHETTES[c.pe][1] : 0
  const coeff = getBareme(c.age, COEFF_CAP)
  const pgpf = c.pgpf_rente * coeff
  const tpTemp = c.tp_h_j_temp * c.tp_jours_temp * c.tp_tarif
  const tpPerm = c.tp_h_j_perm * 365 * c.tp_tarif * coeff
  const fixes = c.pgpa + pgpf + c.incidence_pro + tpTemp + tpPerm + c.frais_actuels + c.frais_futurs + c.agrement + c.sexuel + c.etablissement
  const totalMin = dft + dfp + pdMin + peMin + fixes
  const totalMax = dft + dfp + pdMax + peMax + fixes
  const totalMoy = (totalMin + totalMax) / 2

  const sauvegarder = async () => {
    if (!dossierId) return
    setSaving(true)
    await supabase.from('calculs_prejudice').insert({
      dossier_id: dossierId,
      age_accident: c.age,
      dft_total: dft, dfp, pretium_doloris: (pdMin + pdMax) / 2,
      prejudice_esthetique_montant: (peMin + peMax) / 2,
      pgpa: c.pgpa, pgpf, incidence_professionnelle: c.incidence_pro,
      tierce_personne_temporaire: tpTemp, tierce_personne_permanente: tpPerm,
      frais_medicaux_actuels: c.frais_actuels, frais_futurs: c.frais_futurs,
      prejudice_agrement_montant: c.agrement, prejudice_sexuel_montant: c.sexuel,
      prejudice_etablissement_montant: c.etablissement,
      total_prejudice: totalMoy, total_reclame: totalMax,
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const postes = [
    { l: 'DFT', min: dft, max: dft, i: `${c.dft_total + c.dft_75 + c.dft_50 + c.dft_25}j × ${c.dft_journalier}€` },
    { l: 'DFP', min: dfp, max: dfp, i: `${c.taux_dfp}% × ${eur(pointDFP)}` },
    { l: 'Pretium Doloris', min: pdMin, max: pdMax, i: `${c.qd}/7` },
    { l: 'Préj. Esthétique', min: peMin, max: peMax, i: `${c.pe}/7` },
    { l: 'PGPA', min: c.pgpa, max: c.pgpa, i: '' },
    { l: 'PGPF', min: pgpf, max: pgpf, i: `${eur(c.pgpf_rente)}/an × ${coeff}` },
    { l: 'Incidence pro.', min: c.incidence_pro, max: c.incidence_pro, i: '' },
    { l: 'TP temporaire', min: tpTemp, max: tpTemp, i: `${c.tp_h_j_temp}h/j × ${c.tp_jours_temp}j` },
    { l: 'TP permanente', min: tpPerm, max: tpPerm, i: `${c.tp_h_j_perm}h/j capitalisé` },
    { l: 'Frais médicaux', min: c.frais_actuels, max: c.frais_actuels, i: '' },
    { l: 'Frais futurs', min: c.frais_futurs, max: c.frais_futurs, i: '' },
    { l: "Préj. agrément", min: c.agrement, max: c.agrement, i: '' },
    { l: 'Préj. sexuel', min: c.sexuel, max: c.sexuel, i: '' },
    { l: "Préj. établissement", min: c.etablissement, max: c.etablissement, i: '' },
  ].filter(p => p.max > 0)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator size={24} className="text-cabinet-blue" /> Calculateur Dintilhac
          </h1>
          <p className="text-gray-500 text-sm mt-1">Barèmes jurisprudentiels CA Aix-en-Provence — Table TD 20-22 taux 0%</p>
        </div>
        {dossierId && (
          <button onClick={sauvegarder} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={14} /> {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Saisie */}
        <div className="col-span-2 space-y-4">

          {/* Dossier */}
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Dossier (pré-remplissage automatique)</h3>
            <select value={dossierId} onChange={e => charger(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cabinet-blue/20">
              <option value="">— Calcul libre —</option>
              {dossiers.map(d => (
                <option key={d.id} value={d.id}>{d.reference} — {d.client?.nom} {d.client?.prenom}</option>
              ))}
            </select>
          </div>

          {/* Victime */}
          <div className="card">
            <h3 className="font-semibold mb-4 text-sm text-gray-700">Données victime</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Âge à la consolidation">
                <input type="number" value={c.age} onChange={e => set('age', e.target.value)} className="input-field" min={18} max={90} />
              </Field>
              <Field label="Statut professionnel">
                <select className="input-field" onChange={e => {}}>
                  {['Salarié','Indépendant','Fonctionnaire','Sans emploi','Retraité','Étudiant'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* DFT */}
          <Section title="DFT — Déficit Fonctionnel Temporaire" open={open.dft} onToggle={() => tog('dft')} total={dft}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Taux journalier (€/jour)">
                <input type="number" value={c.dft_journalier} onChange={e => set('dft_journalier', e.target.value)} className="input-field" />
                <p className="text-xs text-gray-400 mt-1">Référence TJ Marseille : 31 €/jour</p>
              </Field>
              <Field label="Jours DFT total (100%)">
                <input type="number" value={c.dft_total || ''} onChange={e => set('dft_total', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="Jours DFT partiel 75%">
                <input type="number" value={c.dft_75 || ''} onChange={e => set('dft_75', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="Jours DFT partiel 50%">
                <input type="number" value={c.dft_50 || ''} onChange={e => set('dft_50', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="Jours DFT partiel 25%">
                <input type="number" value={c.dft_25 || ''} onChange={e => set('dft_25', e.target.value)} className="input-field" placeholder="0" />
              </Field>
            </div>
          </Section>

          {/* DFP */}
          <Section title="DFP — Déficit Fonctionnel Permanent" open={open.dfp} onToggle={() => tog('dfp')} total={dfp}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Taux DFP (%)">
                <input type="number" value={c.taux_dfp || ''} onChange={e => set('taux_dfp', e.target.value)} className="input-field" placeholder="0" min={0} max={100} />
              </Field>
              <div className="bg-blue-50 rounded-lg p-3 flex flex-col justify-center">
                <div className="text-xs text-gray-500 font-medium">Point de préjudice (âge {c.age})</div>
                <div className="text-2xl font-bold text-cabinet-blue mt-1">{eur(pointDFP)}</div>
                <div className="text-xs text-gray-400 mt-0.5">Barème CA Aix-en-Provence</div>
              </div>
            </div>
          </Section>

          {/* Souffrances */}
          <Section title="Souffrances & Préjudices extra-patrimoniaux" open={open.suf} onToggle={() => tog('suf')} total={(pdMin + pdMax) / 2 + (peMin + peMax) / 2}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Field label="Quantum doloris (/7)">
                  <select value={c.qd} onChange={e => set('qd', e.target.value)} className="input-field">
                    <option value={0}>— Non évalué —</option>
                    {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/7</option>)}
                  </select>
                </Field>
                {c.qd > 0 && <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">Fourchette : {eur(pdMin)} — {eur(pdMax)}</div>}
              </div>
              <div>
                <Field label="Préjudice esthétique (/7)">
                  <select value={c.pe} onChange={e => set('pe', e.target.value)} className="input-field">
                    <option value={0}>— Non évalué —</option>
                    {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/7</option>)}
                  </select>
                </Field>
                {c.pe > 0 && <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">Fourchette : {eur(peMin)} — {eur(peMax)}</div>}
              </div>
            </div>
          </Section>

          {/* Professionnel */}
          <Section title="Préjudices professionnels" open={open.pro} onToggle={() => tog('pro')} total={c.pgpa + pgpf + c.incidence_pro}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="PGPA — Pertes actuelles (€)">
                <input type="number" value={c.pgpa || ''} onChange={e => set('pgpa', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="PGPF — Rente annuelle de perte (€/an)">
                <input type="number" value={c.pgpf_rente || ''} onChange={e => set('pgpf_rente', e.target.value)} className="input-field" placeholder="0" />
                {c.pgpf_rente > 0 && <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-700">× coeff. {coeff} = {eur(pgpf)}</div>}
              </Field>
              <Field label="Incidence professionnelle (€)">
                <input type="number" value={c.incidence_pro || ''} onChange={e => set('incidence_pro', e.target.value)} className="input-field" placeholder="0" />
              </Field>
            </div>
          </Section>

          {/* Tierce personne */}
          <Section title="Tierce Personne" open={open.tp} onToggle={() => tog('tp')} total={tpTemp + tpPerm}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Taux horaire (€/h)">
                <input type="number" value={c.tp_tarif} onChange={e => set('tp_tarif', e.target.value)} className="input-field" />
                <p className="text-xs text-gray-400 mt-1">Référence non spécialisé : 22 €/h</p>
              </Field>
              <div />
              <Field label="TP temporaire — heures/jour">
                <input type="number" value={c.tp_h_j_temp || ''} onChange={e => set('tp_h_j_temp', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="TP temporaire — nombre de jours">
                <input type="number" value={c.tp_jours_temp || ''} onChange={e => set('tp_jours_temp', e.target.value)} className="input-field" placeholder="0" />
              </Field>
              <Field label="TP permanente — heures/jour">
                <input type="number" value={c.tp_h_j_perm || ''} onChange={e => set('tp_h_j_perm', e.target.value)} className="input-field" placeholder="0" />
                {c.tp_h_j_perm > 0 && <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-700">{c.tp_h_j_perm}h × 365j × {c.tp_tarif}€ × {coeff} = {eur(tpPerm)}</div>}
              </Field>
            </div>
          </Section>

          {/* Autres */}
          <Section title="Autres préjudices" open={open.autres} onToggle={() => tog('autres')} total={c.frais_actuels + c.frais_futurs + c.agrement + c.sexuel + c.etablissement}>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['frais_actuels','Frais médicaux actuels (€)'],
                ['frais_futurs','Frais futurs (€)'],
                ['agrement',"Préjudice d'agrément (€)"],
                ['sexuel','Préjudice sexuel (€)'],
                ['etablissement',"Préjudice d'établissement (€)"],
              ] as [keyof C, string][]).map(([f, l]) => (
                <Field key={f} label={l}>
                  <input type="number" value={(c[f] as number) || ''} onChange={e => set(f, e.target.value)} className="input-field" placeholder="0" />
                </Field>
              ))}
            </div>
          </Section>
        </div>

        {/* Résultats */}
        <div className="space-y-4 sticky top-4 self-start">
          <div className="card bg-gradient-to-br from-cabinet-blue to-blue-700 text-white">
            <div className="text-sm font-medium opacity-80 mb-1">Total préjudice estimé</div>
            <div className="text-4xl font-bold">{eur(totalMoy)}</div>
            <div className="text-xs opacity-70 mt-1">Fourchette : {eur(totalMin)} — {eur(totalMax)}</div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-xs opacity-80">Montant à réclamer</div>
              <div className="text-2xl font-bold">{eur(totalMax)}</div>
            </div>
          </div>

          <div className="card">
            <Field label="Offre assureur reçue (€)">
              <input type="number" value={c.offre || ''} onChange={e => set('offre', e.target.value)} className="input-field" placeholder="0" />
            </Field>
            {c.offre > 0 && (
              <div className={`mt-3 p-3 rounded-lg ${totalMoy > c.offre ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-xs text-gray-500">Écart offre / estimation</div>
                <div className={`text-xl font-bold mt-0.5 ${totalMoy > c.offre ? 'text-red-600' : 'text-green-600'}`}>
                  {totalMoy > c.offre ? '-' : '+'}{eur(Math.abs(totalMoy - c.offre))}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  L'offre représente {Math.round(c.offre / totalMoy * 100)}% de l'estimation
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={14} />Détail par poste</h3>
            <div className="space-y-2">
              {postes.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Remplissez les données pour voir le calcul</p>}
              {postes.map(p => (
                <div key={p.l} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-medium text-gray-700">{p.l}</div>
                    {p.i && <div className="text-xs text-gray-400">{p.i}</div>}
                  </div>
                  <div className="text-right text-xs ml-2 flex-shrink-0">
                    {p.min === p.max
                      ? <span className="font-semibold text-gray-800">{eur(p.min)}</span>
                      : <span className="text-gray-500">{eur(p.min)}<br/>→ {eur(p.max)}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, open, onToggle, total, children }: {
  title: string; open: boolean; onToggle: () => void; total: number; children: React.ReactNode
}) {
  return (
    <div className="card">
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <div className="flex items-center gap-3">
          {total > 0 && <span className="text-sm font-bold text-cabinet-blue">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(total)}</span>}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      {children}
    </div>
  )
}

export const dynamic = 'force-dynamic'
