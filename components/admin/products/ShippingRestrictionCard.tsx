"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import {
  getDepartments,
  getProvincesByDepartment,
  getDistrictsByProvince,
} from "@/actions/locations"
import type { ShippingRestriction } from "@/lib/cod-forms/types"

const EMPTY: ShippingRestriction = {
  enabled: false,
  allowedDepartmentIds: [],
  allowedProvinceIds: [],
  allowedDistrictCodes: [],
  restrictionMessage: null,
}

export default function ShippingRestrictionCard({
  value,
  onChange,
}: {
  value: ShippingRestriction | null
  onChange: (v: ShippingRestriction | null) => void
}) {
  const restriction = value ?? EMPTY
  const [allDepts, setAllDepts] = useState<{ id: string; name: string }[]>([])
  const [allProvs, setAllProvs] = useState<
    { id: string; name: string; departmentId: string }[]
  >([])
  const [allDists, setAllDists] = useState<
    { code: string; name: string; provinceId: string }[]
  >([])
  const [loadingProvs, setLoadingProvs] = useState(false)
  const [loadingDists, setLoadingDists] = useState(false)

  useEffect(() => {
    getDepartments().then((r) => {
      if (r.success) setAllDepts(r.data)
    })
  }, [])

  const deptKey = restriction.allowedDepartmentIds.join(",")
  useEffect(() => {
    if (!restriction.allowedDepartmentIds.length) {
      setAllProvs([])
      setAllDists([])
      return
    }
    setLoadingProvs(true)
    Promise.all(
      restriction.allowedDepartmentIds.map((id) => getProvincesByDepartment(id)),
    ).then((results) => {
      setAllProvs(results.flatMap((r) => (r.success ? r.data : [])))
      setLoadingProvs(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptKey])

  const provKey = restriction.allowedProvinceIds.join(",")
  useEffect(() => {
    if (!restriction.allowedProvinceIds.length) {
      setAllDists([])
      return
    }
    setLoadingDists(true)
    Promise.all(
      restriction.allowedProvinceIds.map((id) => getDistrictsByProvince(id)),
    ).then((results) => {
      setAllDists(results.flatMap((r) => (r.success ? r.data : [])))
      setLoadingDists(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provKey])

  const update = (patch: Partial<ShippingRestriction>) =>
    onChange({ ...restriction, ...patch })

  const toggleDept = (id: string) => {
    const isRemoving = restriction.allowedDepartmentIds.includes(id)
    if (!isRemoving) {
      // Agregar: conservar las selecciones de provincias / distritos previas.
      update({
        allowedDepartmentIds: [...restriction.allowedDepartmentIds, id],
      })
      return
    }
    // Quitar: podar solo las provincias del departamento removido y los
    // distritos de esas provincias.
    const removedProvinceIds = allProvs
      .filter((p) => p.departmentId === id)
      .map((p) => p.id)
    update({
      allowedDepartmentIds: restriction.allowedDepartmentIds.filter(
        (x) => x !== id,
      ),
      allowedProvinceIds: restriction.allowedProvinceIds.filter(
        (pid) => !removedProvinceIds.includes(pid),
      ),
      allowedDistrictCodes: restriction.allowedDistrictCodes.filter((code) => {
        const dist = allDists.find((d) => d.code === code)
        return !dist || !removedProvinceIds.includes(dist.provinceId)
      }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Cobertura de envío</span>
          <Switch
            checked={restriction.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
          />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Limita los departamentos / provincias / distritos a los que se puede
          enviar este producto. Aplica al carrito normal y al formulario COD.
        </p>
      </CardHeader>
      {restriction.enabled && (
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Mensaje informativo (opcional)</Label>
            <Input
              value={restriction.restrictionMessage ?? ""}
              onChange={(e) =>
                update({ restrictionMessage: e.target.value || null })
              }
              placeholder="Solo hacemos envíos a Lima"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">
              Departamentos permitidos
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Sin selección = acepta todos
            </p>
            <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
              {allDepts.length === 0 ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                allDepts.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={restriction.allowedDepartmentIds.includes(d.id)}
                      onChange={() => toggleDept(d.id)}
                      className="rounded"
                    />
                    {d.name}
                  </label>
                ))
              )}
            </div>
          </div>
          {restriction.allowedDepartmentIds.length > 0 && (
            <ProvincePicker
              loading={loadingProvs}
              all={allProvs}
              selected={restriction.allowedProvinceIds}
              onToggle={(id) => {
                const isRemoving = restriction.allowedProvinceIds.includes(id)
                if (!isRemoving) {
                  // Agregar: conservar los distritos ya seleccionados.
                  update({
                    allowedProvinceIds: [...restriction.allowedProvinceIds, id],
                  })
                  return
                }
                // Quitar: podar solo los distritos de la provincia removida.
                const removedDistrictCodes = allDists
                  .filter((d) => d.provinceId === id)
                  .map((d) => d.code)
                update({
                  allowedProvinceIds: restriction.allowedProvinceIds.filter(
                    (x) => x !== id,
                  ),
                  allowedDistrictCodes: restriction.allowedDistrictCodes.filter(
                    (code) => !removedDistrictCodes.includes(code),
                  ),
                })
              }}
            />
          )}
          {restriction.allowedProvinceIds.length > 0 && (
            <DistrictPicker
              loading={loadingDists}
              all={allDists}
              selected={restriction.allowedDistrictCodes}
              onToggle={(code) => {
                const next = restriction.allowedDistrictCodes.includes(code)
                  ? restriction.allowedDistrictCodes.filter((x) => x !== code)
                  : [...restriction.allowedDistrictCodes, code]
                update({ allowedDistrictCodes: next })
              }}
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}

function ProvincePicker({
  loading,
  all,
  selected,
  onToggle,
}: {
  loading: boolean
  all: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">
        Provincias permitidas (opcional)
      </Label>
      <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          all.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => onToggle(p.id)}
                className="rounded"
              />
              {p.name}
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function DistrictPicker({
  loading,
  all,
  selected,
  onToggle,
}: {
  loading: boolean
  all: { code: string; name: string }[]
  selected: string[]
  onToggle: (code: string) => void
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">
        Distritos permitidos (opcional)
      </Label>
      <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          all.map((d) => (
            <label
              key={d.code}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
            >
              <input
                type="checkbox"
                checked={selected.includes(d.code)}
                onChange={() => onToggle(d.code)}
                className="rounded"
              />
              {d.name}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
