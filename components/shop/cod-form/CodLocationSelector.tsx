"use client"

import { useEffect, useState } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import {
  Building2,
  ChevronDownIcon,
  Loader2,
  Map,
  MapPin,
  type LucideIcon,
} from "lucide-react"
import {
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  getDepartments,
  getProvincesByDepartment,
  getDistrictsByProvince,
} from "@/actions/locations"

interface Department { id: string; code: string; name: string }
interface Province { id: string; code: string; name: string }
interface District { id: string; code: string; name: string }

interface CodLocationSelectorProps {
  value: {
    departmentId: string
    provinceId: string
    districtCode: string
  }
  onChange: (value: {
    departmentId: string
    provinceId: string
    districtCode: string
    departmentName: string
    provinceName: string
    districtName: string
  }) => void
  errors?: {
    department?: string
    province?: string
    district?: string
  }
  allowedDepartmentIds?: string[]
  allowedProvinceIds?: string[]
  allowedDistrictCodes?: string[]
  restrictionMessage?: string
}

interface FloatingSelectProps {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholderEmpty: string
  disabled?: boolean
  loading?: boolean
  hasError?: boolean
}

function FloatingSelect({
  id,
  label,
  icon: Icon,
  value,
  onValueChange,
  options,
  placeholderEmpty,
  disabled,
  loading,
  hasError,
}: FloatingSelectProps) {
  const hasValue = Boolean(value)

  const wrapperState = hasError
    ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
    : "border-gray-200 focus-within:border-primary focus-within:ring-primary/15"

  const iconColor = hasError ? "text-red-500" : "text-gray-400"

  const labelColor = hasError ? "text-red-500" : "text-gray-500"
  const focusLabelColor = hasError
    ? "peer-focus:text-red-500 peer-data-[state=open]:text-red-500"
    : "peer-focus:text-primary peer-data-[state=open]:text-primary"

  // When user has selected a value, the label is "floated" (small uppercase tag).
  // When empty AND closed AND not focused, it sits centered like a placeholder.
  // peer-focus / peer-data-[state=open] always force the floated look.
  const labelStaticClasses = hasValue
    ? "top-1 text-[11px] font-semibold uppercase tracking-wider"
    : "top-1/2 -translate-y-1/2 text-sm font-normal normal-case tracking-normal text-gray-400"

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all duration-150 focus-within:ring-4 focus-within:shadow-none ${wrapperState} ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {loading ? (
        <div className="flex h-14 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <SelectPrimitive.Root
          value={value || undefined}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            id={id}
            data-slot="select-trigger"
            className="peer flex h-14 w-full items-center gap-2 bg-transparent pl-11 pr-3 pt-5 pb-1 text-left text-sm text-gray-900 outline-none transition-colors disabled:cursor-not-allowed data-[placeholder]:text-transparent"
          >
            <SelectPrimitive.Value
              data-slot="select-value"
              placeholder=" "
              className="line-clamp-1 flex-1 text-left"
            />
            <SelectPrimitive.Icon asChild>
              <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                {placeholderEmpty}
              </div>
            ) : (
              options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))
            )}
          </SelectContent>

          <label
            htmlFor={id}
            className={`
              pointer-events-none absolute left-11 right-8 z-10 select-none truncate transition-all duration-150
              ${labelColor} ${labelStaticClasses}
              peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider
              peer-data-[state=open]:top-1 peer-data-[state=open]:translate-y-0 peer-data-[state=open]:text-[11px] peer-data-[state=open]:font-semibold peer-data-[state=open]:uppercase peer-data-[state=open]:tracking-wider
              ${focusLabelColor}
            `}
          >
            {label}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
        </SelectPrimitive.Root>
      )}

      <Icon
        aria-hidden
        className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${iconColor}`}
      />
    </div>
  )
}

export default function CodLocationSelector({
  value,
  onChange,
  errors = {},
  allowedDepartmentIds,
  allowedProvinceIds,
  allowedDistrictCodes,
  restrictionMessage,
}: CodLocationSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  useEffect(() => {
    getDepartments().then((r) => {
      if (r.success) setDepartments(r.data)
      setLoadingDepartments(false)
    })
  }, [])

  useEffect(() => {
    if (value.departmentId) {
      setLoadingProvinces(true)
      getProvincesByDepartment(value.departmentId).then((r) => {
        if (r.success) setProvinces(r.data)
        setLoadingProvinces(false)
      })
    } else {
      setProvinces([])
      setDistricts([])
    }
  }, [value.departmentId])

  useEffect(() => {
    if (value.provinceId) {
      setLoadingDistricts(true)
      getDistrictsByProvince(value.provinceId).then((r) => {
        if (r.success) setDistricts(r.data)
        setLoadingDistricts(false)
      })
    } else {
      setDistricts([])
    }
  }, [value.provinceId])

  const visibleDepts = allowedDepartmentIds?.length
    ? departments.filter((d) => allowedDepartmentIds.includes(d.id))
    : departments
  const visibleProvs = allowedProvinceIds?.length
    ? provinces.filter((p) => allowedProvinceIds.includes(p.id))
    : provinces
  const visibleDists = allowedDistrictCodes?.length
    ? districts.filter((d) => allowedDistrictCodes.includes(d.code))
    : districts

  const handleDepartmentChange = (departmentId: string) => {
    const department = departments.find((d) => d.id === departmentId)
    onChange({
      departmentId,
      provinceId: "",
      districtCode: "",
      departmentName: department?.name || "",
      provinceName: "",
      districtName: "",
    })
  }

  const handleProvinceChange = (provinceId: string) => {
    const province = provinces.find((p) => p.id === provinceId)
    const department = departments.find((d) => d.id === value.departmentId)
    onChange({
      departmentId: value.departmentId,
      provinceId,
      districtCode: "",
      departmentName: department?.name || "",
      provinceName: province?.name || "",
      districtName: "",
    })
  }

  const handleDistrictChange = (districtCode: string) => {
    const district = districts.find((d) => d.code === districtCode)
    const province = provinces.find((p) => p.id === value.provinceId)
    const department = departments.find((d) => d.id === value.departmentId)
    onChange({
      departmentId: value.departmentId,
      provinceId: value.provinceId,
      districtCode,
      departmentName: department?.name || "",
      provinceName: province?.name || "",
      districtName: district?.name || "",
    })
  }

  // Auto-select when only one option is available
  useEffect(() => {
    if (!loadingDepartments && visibleDepts.length === 1 && !value.departmentId) {
      handleDepartmentChange(visibleDepts[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDepartments, visibleDepts.length])

  useEffect(() => {
    if (!loadingProvinces && visibleProvs.length === 1 && !value.provinceId) {
      handleProvinceChange(visibleProvs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProvinces, visibleProvs.length])

  useEffect(() => {
    if (!loadingDistricts && visibleDists.length === 1 && !value.districtCode) {
      handleDistrictChange(visibleDists[0].code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDistricts, visibleDists.length])

  return (
    <div className="space-y-2">
      {restrictionMessage && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          📍 {restrictionMessage}
        </p>
      )}
      <div className="space-y-3">
        <div className="space-y-1">
          <FloatingSelect
            id="cod-department"
            label="Departamento"
            icon={Map}
            value={value.departmentId}
            onValueChange={handleDepartmentChange}
            options={visibleDepts.map((d) => ({ value: d.id, label: d.name }))}
            placeholderEmpty="Sin opciones"
            loading={loadingDepartments}
            hasError={Boolean(errors.department)}
          />
          {errors.department && (
            <p className="ml-1 text-xs text-red-600">{errors.department}</p>
          )}
        </div>

        <div className="space-y-1">
          <FloatingSelect
            id="cod-province"
            label="Provincia"
            icon={Building2}
            value={value.provinceId}
            onValueChange={handleProvinceChange}
            options={visibleProvs.map((p) => ({ value: p.id, label: p.name }))}
            placeholderEmpty={
              !value.departmentId ? "Elige depto. primero" : "Sin opciones"
            }
            loading={loadingProvinces}
            disabled={!value.departmentId || visibleProvs.length === 0}
            hasError={Boolean(errors.province)}
          />
          {errors.province && (
            <p className="ml-1 text-xs text-red-600">{errors.province}</p>
          )}
        </div>

        <div className="space-y-1">
          <FloatingSelect
            id="cod-district"
            label="Distrito"
            icon={MapPin}
            value={value.districtCode}
            onValueChange={handleDistrictChange}
            options={visibleDists.map((d) => ({ value: d.code, label: d.name }))}
            placeholderEmpty={
              !value.provinceId ? "Elige provincia primero" : "Sin opciones"
            }
            loading={loadingDistricts}
            disabled={!value.provinceId || visibleDists.length === 0}
            hasError={Boolean(errors.district)}
          />
          {errors.district && (
            <p className="ml-1 text-xs text-red-600">{errors.district}</p>
          )}
        </div>
      </div>
    </div>
  )
}
