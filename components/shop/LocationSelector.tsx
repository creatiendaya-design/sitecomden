"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDepartments,
  getProvincesByDepartment,
  getDistrictsByProvince,
} from "@/actions/locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckoutField,
  CheckoutSelect,
} from "@/components/checkout/CheckoutField";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

interface Department { id: string; code: string; name: string; }
interface Province { id: string; code: string; name: string; }
interface District { id: string; code: string; name: string; }

interface LocationSelectorProps {
  value: {
    departmentId: string;
    provinceId: string;
    districtCode: string;
  };
  onChange: (value: {
    departmentId: string;
    provinceId: string;
    districtCode: string;
    departmentName: string;
    provinceName: string;
    districtName: string;
  }) => void;
  errors?: {
    department?: string;
    province?: string;
    district?: string;
  };
  allowedDepartmentIds?: string[];
  allowedProvinceIds?: string[];
  allowedDistrictCodes?: string[];
  restrictionMessage?: string;
  /**
   * Departments resolved on the server. When provided we seed state from it
   * and skip the on-mount fetch — no cold-Neon round-trip, no spinner.
   */
  initialDepartments?: Department[];
  /**
   * Visual variant. "default" keeps the shadcn look used by admin/other
   * surfaces; "checkout" renders the taller, graphite, icon-aware storefront
   * fields. Default is "default" so existing usages are untouched.
   */
  variant?: "default" | "checkout";
}

interface LocationFieldOption {
  value: string;
  label: string;
}

interface LocationFieldProps {
  variant: "default" | "checkout";
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: LocationFieldOption[];
  loading: boolean;
  disabled?: boolean;
  placeholder: string;
  error?: string;
  /** Show the pin icon (checkout variant only). */
  showIcon?: boolean;
}

/** One dependent select, rendered per `variant`. Keeps the 3 fields DRY. */
function LocationField({
  variant,
  id,
  label,
  value,
  onValueChange,
  options,
  loading,
  disabled,
  placeholder,
  error,
  showIcon,
}: LocationFieldProps) {
  if (variant === "checkout") {
    return (
      <CheckoutField label={label} htmlFor={id} required error={error}>
        {loading ? (
          <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : (
          <CheckoutSelect
            id={id}
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            placeholder={placeholder}
            error={!!error}
            icon={showIcon ? <MapPin /> : undefined}
          >
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </CheckoutSelect>
        )}
      </CheckoutField>
    );
  }

  // Default (admin / legacy) look — unchanged.
  return (
    <div>
      <Label htmlFor={id}>
        {label} <span className="text-destructive mb-2">*</span>
      </Label>
      {loading ? (
        <div className="flex items-center justify-center h-10 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger
            id={id}
            className={`w-full ${error ? "border-destructive" : ""}`}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default function LocationSelector({
  value,
  onChange,
  errors = {},
  allowedDepartmentIds,
  allowedProvinceIds,
  allowedDistrictCodes,
  restrictionMessage,
  initialDepartments,
  variant = "default",
}: LocationSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>(
    initialDepartments ?? []
  );
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(
    !initialDepartments?.length
  );
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    if (initialDepartments?.length) return;
    getDepartments().then((r) => {
      if (r.success) setDepartments(r.data);
      setLoadingDepartments(false);
    });
  }, [initialDepartments]);

  useEffect(() => {
    if (value.departmentId) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- triggers async data fetch; loading flag set synchronously */
      setLoadingProvinces(true);
      getProvincesByDepartment(value.departmentId).then((r) => {
        if (r.success) setProvinces(r.data);
        setLoadingProvinces(false);
      });
    } else {
      setProvinces([]);
      setDistricts([]);
    }
  }, [value.departmentId]);

  useEffect(() => {
    if (value.provinceId) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- triggers async data fetch; loading flag set synchronously */
      setLoadingDistricts(true);
      getDistrictsByProvince(value.provinceId).then((r) => {
        if (r.success) setDistricts(r.data);
        setLoadingDistricts(false);
      });
    } else {
      setDistricts([]);
    }
  }, [value.provinceId]);

  // Filtered lists based on restrictions
  const visibleDepts = allowedDepartmentIds?.length
    ? departments.filter((d) => allowedDepartmentIds.includes(d.id))
    : departments;

  const visibleProvs = allowedProvinceIds?.length
    ? provinces.filter((p) => allowedProvinceIds.includes(p.id))
    : provinces;

  const visibleDists = allowedDistrictCodes?.length
    ? districts.filter((d) => allowedDistrictCodes.includes(d.code))
    : districts;

  const handleDepartmentChange = useCallback((departmentId: string) => {
    const department = departments.find((d) => d.id === departmentId);
    onChange({
      departmentId,
      provinceId: "",
      districtCode: "",
      departmentName: department?.name || "",
      provinceName: "",
      districtName: "",
    });
  }, [departments, onChange]);

  const handleProvinceChange = useCallback((provinceId: string) => {
    const province = provinces.find((p) => p.id === provinceId);
    const department = departments.find((d) => d.id === value.departmentId);
    onChange({
      departmentId: value.departmentId,
      provinceId,
      districtCode: "",
      departmentName: department?.name || "",
      provinceName: province?.name || "",
      districtName: "",
    });
  }, [provinces, departments, value.departmentId, onChange]);

  const handleDistrictChange = useCallback((districtCode: string) => {
    const district = districts.find((d) => d.code === districtCode);
    const province = provinces.find((p) => p.id === value.provinceId);
    const department = departments.find((d) => d.id === value.departmentId);
    onChange({
      departmentId: value.departmentId,
      provinceId: value.provinceId,
      districtCode,
      departmentName: department?.name || "",
      provinceName: province?.name || "",
      districtName: district?.name || "",
    });
  }, [districts, provinces, departments, value.departmentId, value.provinceId, onChange]);

  // Auto-select when only one option is available
  useEffect(() => {
    if (!loadingDepartments && visibleDepts.length === 1 && !value.departmentId) {
      handleDepartmentChange(visibleDepts[0].id);
    }
  }, [loadingDepartments, visibleDepts, value.departmentId, handleDepartmentChange]);

  useEffect(() => {
    if (!loadingProvinces && visibleProvs.length === 1 && !value.provinceId) {
      handleProvinceChange(visibleProvs[0].id);
    }
  }, [loadingProvinces, visibleProvs, value.provinceId, handleProvinceChange]);

  useEffect(() => {
    if (!loadingDistricts && visibleDists.length === 1 && !value.districtCode) {
      handleDistrictChange(visibleDists[0].code);
    }
  }, [loadingDistricts, visibleDists, value.districtCode, handleDistrictChange]);

  return (
    <div className="space-y-4">
      {restrictionMessage && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          📍 {restrictionMessage}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <LocationField
          variant={variant}
          id="department"
          label="Departamento"
          value={value.departmentId}
          onValueChange={handleDepartmentChange}
          options={visibleDepts.map((d) => ({ value: d.id, label: d.name }))}
          loading={loadingDepartments}
          placeholder="Selecciona"
          error={errors.department}
          showIcon
        />

        <LocationField
          variant={variant}
          id="province"
          label="Provincia"
          value={value.provinceId}
          onValueChange={handleProvinceChange}
          options={visibleProvs.map((p) => ({ value: p.id, label: p.name }))}
          loading={loadingProvinces}
          disabled={!value.departmentId || visibleProvs.length === 0}
          placeholder={!value.departmentId ? "Primero depto." : "Selecciona"}
          error={errors.province}
        />

        <LocationField
          variant={variant}
          id="district"
          label="Distrito"
          value={value.districtCode}
          onValueChange={handleDistrictChange}
          options={visibleDists.map((d) => ({ value: d.code, label: d.name }))}
          loading={loadingDistricts}
          disabled={!value.provinceId || visibleDists.length === 0}
          placeholder={!value.provinceId ? "Primero prov." : "Selecciona"}
          error={errors.district}
        />
      </div>
    </div>
  );
}
