import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X } from "lucide-react";
import type { InterventionDetail } from "@workspace/api-client-react";
import { SectionBlock } from "./SectionBlock";
import { detailStepLockedMessage } from "@/lib/wizard-steps";

type ClientForm = { nomClient: string; telephone: string; email: string; adresse: string };
type VehiculeForm = {
  immatriculation: string;
  marque: string;
  modele: string;
  vin: string;
  motorisation: string;
  kilometrage: string | number;
};

export function ClientVehiculeSection({
  intervention,
  editingClient,
  editingVehicule,
  clientForm,
  vehiculeForm,
  onStartEditClient,
  onCancelEditClient,
  onSaveClient,
  onStartEditVehicule,
  onCancelEditVehicule,
  onSaveVehicule,
  onClientFormChange,
  onVehiculeFormChange,
  clientSaving,
  vehiculeSaving,
  canEditClient,
  canEditVehicule,
}: {
  intervention: InterventionDetail;
  editingClient: boolean;
  editingVehicule: boolean;
  clientForm: ClientForm;
  vehiculeForm: VehiculeForm;
  onStartEditClient: () => void;
  onCancelEditClient: () => void;
  onSaveClient: () => void;
  onStartEditVehicule: () => void;
  onCancelEditVehicule: () => void;
  onSaveVehicule: () => void;
  onClientFormChange: (f: ClientForm) => void;
  onVehiculeFormChange: (f: VehiculeForm) => void;
  clientSaving: boolean;
  vehiculeSaving: boolean;
  canEditClient: boolean;
  canEditVehicule: boolean;
}) {
  const clientLocked = !canEditClient;
  const vehiculeLocked = !canEditVehicule;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionBlock
        title="Client"
        description="Étape 1 du dossier"
        locked={clientLocked}
        lockedMessage={detailStepLockedMessage(0)}
        action={
          intervention.client &&
          !clientLocked &&
          (editingClient ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelEditClient} disabled={clientSaving}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={onSaveClient} disabled={clientSaving}>
                <Save className="w-4 h-4 mr-1" />
                {clientSaving ? "..." : "OK"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onStartEditClient}>
              <Pencil className="w-4 h-4 mr-1" /> Modifier
            </Button>
          ))
        }
      >
        {!intervention.client ? (
          <p className="text-slate-500 text-sm">Aucun client associé.</p>
        ) : editingClient && !clientLocked ? (
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={clientForm.nomClient} onChange={(e) => onClientFormChange({ ...clientForm, nomClient: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone</Label>
                <Input value={clientForm.telephone} onChange={(e) => onClientFormChange({ ...clientForm, telephone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={clientForm.email} onChange={(e) => onClientFormChange({ ...clientForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adresse</Label>
                <Input value={clientForm.adresse} onChange={(e) => onClientFormChange({ ...clientForm, adresse: e.target.value })} />
              </div>
            </div>
          ) : (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Nom</dt>
                <dd className="font-medium text-slate-900">{intervention.client.nomClient}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Téléphone</dt>
                <dd className="font-medium">{intervention.client.telephone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd>{intervention.client.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Adresse</dt>
                <dd>{intervention.client.adresse || "—"}</dd>
              </div>
            </dl>
        )}
      </SectionBlock>

      <SectionBlock
        title="Véhicule"
        description="Étape 2 du dossier"
        locked={vehiculeLocked}
        lockedMessage={detailStepLockedMessage(1)}
        action={
          intervention.vehicule &&
          !vehiculeLocked &&
          (editingVehicule ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelEditVehicule} disabled={vehiculeSaving}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={onSaveVehicule} disabled={vehiculeSaving}>
                <Save className="w-4 h-4 mr-1" />
                {vehiculeSaving ? "..." : "OK"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onStartEditVehicule}>
              <Pencil className="w-4 h-4 mr-1" /> Modifier
            </Button>
          ))
        }
      >
        {!intervention.vehicule ? (
            <p className="text-slate-500 text-sm">Aucun véhicule associé.</p>
          ) : editingVehicule && !vehiculeLocked ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Immatriculation</Label>
                <Input
                  className="uppercase"
                  value={vehiculeForm.immatriculation}
                  onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, immatriculation: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marque</Label>
                <Input value={vehiculeForm.marque} onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, marque: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modèle</Label>
                <Input value={vehiculeForm.modele} onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, modele: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">VIN</Label>
                <Input
                  className="uppercase"
                  value={vehiculeForm.vin}
                  onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, vin: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motorisation</Label>
                <Input value={vehiculeForm.motorisation} onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, motorisation: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kilométrage</Label>
                <Input
                  type="number"
                  value={vehiculeForm.kilometrage}
                  onChange={(e) => onVehiculeFormChange({ ...vehiculeForm, kilometrage: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Immatriculation</dt>
                <dd className="text-xl font-bold uppercase text-slate-900">{intervention.vehicule.immatriculation}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Marque / Modèle</dt>
                <dd className="font-medium">
                  {intervention.vehicule.marque} {intervention.vehicule.modele}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Kilométrage</dt>
                <dd>{intervention.vehicule.kilometrage ? `${intervention.vehicule.kilometrage} km` : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">VIN</dt>
                <dd className="uppercase">{intervention.vehicule.vin || "—"}</dd>
              </div>
            </dl>
        )}
      </SectionBlock>
    </div>
  );
}
