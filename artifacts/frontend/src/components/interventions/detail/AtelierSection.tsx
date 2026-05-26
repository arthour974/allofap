import {
  DiagnosticAccessoires,
  DiagnosticCeramique,
  ResultatFinal,
} from "@workspace/api-client-react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { AlertTriangle, Download, FileText, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionBlock } from "./SectionBlock";
import { detailStepLockedMessage } from "@/lib/wizard-steps";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormData = Record<string, any>;

const WIZARD = {
  VALIDATION_RECEPTION: 2,
  CONTROLE_INITIAL: 3,
  NETTOYAGE: 4,
  SECHAGE: 5,
  CONTROLE_FINAL: 6,
  RESTITUTION: 7,
} as const;

function SaveSectionButton({
  onClick,
  saving,
  disabled,
}: {
  onClick: () => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={saving || disabled}>
      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
      Enregistrer
    </Button>
  );
}

export function AtelierSection({
  formData,
  efficacite,
  efficaciteColor,
  rapportPdfUrl,
  onChange,
  onSaveFields,
  onGeneratePdf,
  pdfPending,
  saving,
  canEditStep,
}: {
  formData: FormData;
  efficacite: number;
  efficaciteColor: string;
  rapportPdfUrl?: string | null;
  onChange: (field: string, value: unknown) => void;
  onSaveFields: (fields: string[]) => void;
  onGeneratePdf: () => void;
  pdfPending: boolean;
  saving?: boolean;
  canEditStep: (stepIndex: number) => boolean;
}) {
  const setCheck = (field: string, checked: CheckedState) => {
    onChange(field, checked === true);
  };

  const lock = (step: number) => !canEditStep(step);

  return (
    <div className="space-y-6">
      <SectionBlock
        title="Validation réception"
        description="Étape 3 du dossier — accord client"
        locked={lock(WIZARD.VALIDATION_RECEPTION)}
        lockedMessage={detailStepLockedMessage(WIZARD.VALIDATION_RECEPTION)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.VALIDATION_RECEPTION)}
            onClick={() => onSaveFields(["validationClientReception"])}
          />
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border p-3">
          <Checkbox
            id="validationClient"
            checked={formData.validationClientReception}
            onCheckedChange={(c) => setCheck("validationClientReception", c)}
          />
          <Label htmlFor="validationClient" className="text-sm cursor-pointer leading-snug">
            Le client valide la réception et autorise le contrôle / nettoyage du FAP
          </Label>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Contrôle initial"
        description="Étape 4 — mesures et diagnostics à l'entrée"
        locked={lock(WIZARD.CONTROLE_INITIAL)}
        lockedMessage={detailStepLockedMessage(WIZARD.CONTROLE_INITIAL)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.CONTROLE_INITIAL)}
            onClick={() =>
              onSaveFields([
                "poidsEntreeG",
                "pressionEntreeMbar",
                "diagnosticAccessoires",
                "diagnosticCeramique",
              ])
            }
          />
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Poids entrée (g)</Label>
            <Input
              type="number"
              value={formData.poidsEntreeG}
              onChange={(e) => onChange("poidsEntreeG", e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pression entrée (mbar)</Label>
            <Input
              type="number"
              value={formData.pressionEntreeMbar}
              onChange={(e) => onChange("pressionEntreeMbar", e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnostic accessoires</Label>
            <Select value={formData.diagnosticAccessoires} onValueChange={(v) => onChange("diagnosticAccessoires", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DiagnosticAccessoires.OK}>OK</SelectItem>
                <SelectItem value={DiagnosticAccessoires.SONDE_CASSEE}>Sonde cassée</SelectItem>
                <SelectItem value={DiagnosticAccessoires.TUBES_HS}>Tubes HS</SelectItem>
                <SelectItem value={DiagnosticAccessoires.GRIPPE}>Grippé</SelectItem>
                <SelectItem value={DiagnosticAccessoires.AUTRE}>Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Diagnostic céramique</Label>
            <Select value={formData.diagnosticCeramique} onValueChange={(v) => onChange("diagnosticCeramique", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DiagnosticCeramique.SAIN}>Sain</SelectItem>
                <SelectItem value={DiagnosticCeramique.FISSURE}>Fissuré</SelectItem>
                <SelectItem value={DiagnosticCeramique.FONDU}>Fondu</SelectItem>
                <SelectItem value={DiagnosticCeramique.HUILE}>Plein d'huile</SelectItem>
                <SelectItem value={DiagnosticCeramique.COLMATE}>Colmaté</SelectItem>
              </SelectContent>
            </Select>
            {formData.diagnosticCeramique === DiagnosticCeramique.FONDU && (
              <p className="text-red-600 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> FAP fondu — nettoyage impossible
              </p>
            )}
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Nettoyage"
        description="Étape 5 — intervention en atelier"
        locked={lock(WIZARD.NETTOYAGE)}
        lockedMessage={detailStepLockedMessage(WIZARD.NETTOYAGE)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.NETTOYAGE)}
            onClick={() =>
              onSaveFields([
                "validationEntreeAtelier",
                "nettoyageCommence",
                "nettoyageTermine",
                "observationAtelier",
              ])
            }
          />
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="validationEntreeAtelier"
              checked={formData.validationEntreeAtelier}
              onCheckedChange={(c) => setCheck("validationEntreeAtelier", c)}
            />
            <Label htmlFor="validationEntreeAtelier" className="text-sm cursor-pointer">Entrée atelier confirmée</Label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={formData.nettoyageCommence}
                onCheckedChange={(c) => setCheck("nettoyageCommence", c)}
              />
              Nettoyage commencé
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={formData.nettoyageTermine}
                onCheckedChange={(c) => setCheck("nettoyageTermine", c)}
              />
              Nettoyage terminé
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Observations atelier</Label>
            <Textarea
              className="min-h-[80px]"
              placeholder="Remarques pendant le nettoyage..."
              value={formData.observationAtelier}
              onChange={(e) => onChange("observationAtelier", e.target.value)}
            />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Séchage"
        description="Étape 6"
        locked={lock(WIZARD.SECHAGE)}
        lockedMessage={detailStepLockedMessage(WIZARD.SECHAGE)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.SECHAGE)}
            onClick={() => onSaveFields(["sechageCommence", "sechageTermine"])}
          />
        }
      >
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={formData.sechageCommence} onCheckedChange={(c) => setCheck("sechageCommence", c)} />
            Séchage commencé
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={formData.sechageTermine} onCheckedChange={(c) => setCheck("sechageTermine", c)} />
            Séchage terminé
          </label>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Contrôle final"
        description="Étape 7 — mesures de sortie"
        locked={lock(WIZARD.CONTROLE_FINAL)}
        lockedMessage={detailStepLockedMessage(WIZARD.CONTROLE_FINAL)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.CONTROLE_FINAL)}
            onClick={() =>
              onSaveFields(["poidsSortieG", "pressionSortieMbar", "resultatFinal", "validationTechnicien"])
            }
          />
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Poids sortie (g)</Label>
            <Input
              type="number"
              value={formData.poidsSortieG}
              onChange={(e) => onChange("poidsSortieG", e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pression sortie (mbar)</Label>
            <Input
              type="number"
              value={formData.pressionSortieMbar}
              onChange={(e) => onChange("pressionSortieMbar", e.target.value ? Number(e.target.value) : "")}
            />
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border text-sm">
          <div>
            <span className="text-slate-500">Masse extraite</span>
            <p className="text-xl font-bold">
              {formData.poidsEntreeG && formData.poidsSortieG
                ? (Number(formData.poidsEntreeG) - Number(formData.poidsSortieG)).toFixed(0)
                : "—"}{" "}
              g
            </p>
          </div>
          <div>
            <span className="text-slate-500">Efficacité</span>
            <p className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {formData.pressionEntreeMbar && formData.pressionSortieMbar ? efficacite.toFixed(1) : "—"} %
              </span>
              {formData.pressionEntreeMbar && formData.pressionSortieMbar && (
                <Badge className={efficaciteColor}>
                  {efficacite >= 50 ? "Bon" : efficacite >= 20 ? "Moyen" : efficacite >= 10 ? "Faible" : "Insuffisant"}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 max-w-md">
          <Label>Résultat final</Label>
          <Select value={formData.resultatFinal} onValueChange={(v) => onChange("resultatFinal", v)}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ResultatFinal.NETTOYE}>Nettoyé avec succès</SelectItem>
              <SelectItem value={ResultatFinal.PARTIELLEMENT_NETTOYE}>Partiellement nettoyé</SelectItem>
              <SelectItem value={ResultatFinal.NON_NETTOYABLE}>Non nettoyable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
          <Checkbox
            id="validationTechnicien"
            checked={formData.validationTechnicien}
            onCheckedChange={(c) => setCheck("validationTechnicien", c)}
          />
          <Label htmlFor="validationTechnicien" className="text-sm cursor-pointer">
            Contrôle final validé par le technicien
          </Label>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Préconisations & restitution"
        description="Étape 8"
        locked={lock(WIZARD.RESTITUTION)}
        lockedMessage={detailStepLockedMessage(WIZARD.RESTITUTION)}
        action={
          <SaveSectionButton
            saving={saving}
            disabled={lock(WIZARD.RESTITUTION)}
            onClick={() =>
              onSaveFields([
                "preconisationCapteurPression",
                "preconisationEgr",
                "preconisationRegenerationAutoroute",
                "preconisationControlInjecteurs",
                "preconisationControlTurbo",
                "preconisationControlConsommationHuile",
                "clientInforme",
                "fapRestitue",
              ])
            }
          />
        }
      >
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            { id: "preconisationCapteurPression", label: "Capteur de pression" },
            { id: "preconisationEgr", label: "Vanne EGR" },
            { id: "preconisationRegenerationAutoroute", label: "Régénération autoroute" },
            { id: "preconisationControlInjecteurs", label: "Contrôle injecteurs" },
            { id: "preconisationControlTurbo", label: "Contrôle turbo" },
            { id: "preconisationControlConsommationHuile", label: "Consommation d'huile" },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={formData[item.id]} onCheckedChange={(c) => setCheck(item.id, c)} />
              {item.label}
            </label>
          ))}
        </div>
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={formData.clientInforme} onCheckedChange={(c) => setCheck("clientInforme", c)} />
            Client informé
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={formData.fapRestitue} onCheckedChange={(c) => setCheck("fapRestitue", c)} />
            FAP restitué
          </label>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={pdfPending || lock(WIZARD.RESTITUTION)}
              onClick={onGeneratePdf}
            >
              <FileText className="w-4 h-4 mr-2" />
              {pdfPending ? "Génération..." : "Générer le rapport PDF"}
            </Button>
            {rapportPdfUrl && (
              <a href={rapportPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                <Download className="w-4 h-4 mr-1" /> Télécharger le rapport
              </a>
            )}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
