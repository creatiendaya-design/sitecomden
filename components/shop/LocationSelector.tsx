"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

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
}

export default function LocationSelector({
  value,
  onChange,
  errors = {},
  allowedDepartmentIds,
  allowedProvinceIds,
  allowedDistrictCodes,
  restrictionMessage,
}: LocationSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    getDepartments().then((r) => {
      if (r.success) setDepartments(r.data);
      setLoadingDepartments(false);
    });
  }, []);

  useEffect(() => {
    if (value.departmentId) {
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

  // Auto-select when only one option is available
  useEffect(() => {
    if (!loadingDepartments && visibleDepts.length === 1 && !value.departmentId) {
      handleDepartmentChange(visibleDepts[0].id);
    }
  }, [loadingDepartments, visibleDepts.length]);

  useEffect(() => {
    if (!loadingProvinces && visibleProvs.length === 1 && !value.provinceId) {
      handleProvinceChange(visibleProvs[0].id);
    }
  }, [loadingProvinces, visibleProvs.length]);

  useEffect(() => {
    if (!loadingDistricts && visibleDists.length === 1 && !value.districtCode) {
      handleDistrictChange(visibleDists[0].code);
    }
  }, [loadingDistricts, visibleDists.length]);

  const handleDepartmentChange = (departmentId: string) => {
    const department = departments.find((d) => d.id === departmentId);
    onChange({
      departmentId,
      provinceId: "",
      districtCode: "",
      departmentName: department?.name || "",
      provinceName: "",
      districtName: "",
    });
  };

  const handleProvinceChange = (provinceId: string) => {
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
  };

  const handleDistrictChange = (districtCode: string) => {
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
  };

  return (
    <div className="space-y-4">
      {restrictionMessage && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          📍 {restrictionMessage}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Departamento */}
        <div>
          <Label htmlFor="department">
            Departamento <span className="text-destructive mb-2">*</span>
          </Label>
          {loadingDepartments ? (
            <div className="flex items-center justify-center h-10 border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <Select value={value.departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger
                id="department"
                className={`w-full ${errors.department ? "border-destructive" : ""}`}
              >
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {visibleDepts.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.department && (
            <p className="text-xs text-destructive mt-1">{errors.department}</p>
          )}
        </div>

        {/* Provincia */}
        <div>
          <Label htmlFor="province">
            Provincia <span className="text-destructive mb-2">*</span>
          </Label>
          {loadingProvinces ? (
            <div className="flex items-center justify-center h-10 border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <Select
              value={value.provinceId}
              onValueChange={handleProvinceChange}
              disabled={!value.departmentId || visibleProvs.length === 0}
            >
              <SelectTrigger
                id="province"
                className={`w-full ${errors.province ? "border-destructive" : ""}`}
              >
                <SelectValue
                  placeholder={!value.departmentId ? "Primero depto." : "Selecciona"}
                />
              </SelectTrigger>
              <SelectContent>
                {visibleProvs.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.province && (
            <p className="text-xs text-destructive mt-1">{errors.province}</p>
          )}
        </div>

        {/* Distrito */}
        <div>
          <Label htmlFor="district">
            Distrito <span className="text-destructive mb-2">*</span>
          </Label>
          {loadingDistricts ? (
            <div className="flex items-center justify-center h-10 border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <Select
              value={value.districtCode}
              onValueChange={handleDistrictChange}
              disabled={!value.provinceId || visibleDists.length === 0}
            >
              <SelectTrigger
                id="district"
                className={`w-full ${errors.district ? "border-destructive" : ""}`}
              >
                <SelectValue
                  placeholder={!value.provinceId ? "Primero prov." : "Selecciona"}
                />
              </SelectTrigger>
              <SelectContent>
                {visibleDists.map((dist) => (
                  <SelectItem key={dist.id} value={dist.code}>
                    {dist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.district && (
            <p className="text-xs text-destructive mt-1">{errors.district}</p>
          )}
        </div>
      </div>
    </div>
  );
}
