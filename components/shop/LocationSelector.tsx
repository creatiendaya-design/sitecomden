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

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Province {
  id: string;
  code: string;
  name: string;
}

interface District {
  id: string;
  code: string;
  name: string;
}

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
}

export default function LocationSelector({
  value,
  onChange,
  errors = {},
}: LocationSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Cargar departamentos al montar
  useEffect(() => {
    loadDepartments();
  }, []);

  // Cargar provincias cuando cambia el departamento
  useEffect(() => {
    if (value.departmentId) {
      loadProvinces(value.departmentId);
    } else {
      setProvinces([]);
      setDistricts([]);
    }
  }, [value.departmentId]);

  // Cargar distritos cuando cambia la provincia
  useEffect(() => {
    if (value.provinceId) {
      loadDistricts(value.provinceId);
    } else {
      setDistricts([]);
    }
  }, [value.provinceId]);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    const result = await getDepartments();
    if (result.success) {
      setDepartments(result.data);
    }
    setLoadingDepartments(false);
  };

  const loadProvinces = async (departmentId: string) => {
    setLoadingProvinces(true);
    const result = await getProvincesByDepartment(departmentId);
    if (result.success) {
      setProvinces(result.data);
    }
    setLoadingProvinces(false);
  };

  const loadDistricts = async (provinceId: string) => {
    setLoadingDistricts(true);
    const result = await getDistrictsByProvince(provinceId);
    if (result.success) {
      setDistricts(result.data);
    }
    setLoadingDistricts(false);
  };

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
      {/* Grid responsive: 1 columna en mobile, 3 columnas en desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                className={errors.department ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
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
              disabled={!value.departmentId || provinces.length === 0}
            >
              <SelectTrigger
                id="province"
                className={errors.province ? "border-destructive" : ""}
              >
                <SelectValue
                  placeholder={
                    !value.departmentId
                      ? "Primero depto."
                      : "Selecciona"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((prov) => (
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
              disabled={!value.provinceId || districts.length === 0}
            >
              <SelectTrigger
                id="district"
                className={errors.district ? "border-destructive" : ""}
              >
                <SelectValue
                  placeholder={
                    !value.provinceId
                      ? "Primero prov."
                      : "Selecciona"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {districts.map((dist) => (
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