"use client";

import { useState, useEffect } from "react";
import { checkShippingCoverage } from "@/actions/shipping-checkout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface DistrictCoverageProps {
  districtCode: string;
  onCoverageCheck?: (hasShipping: boolean) => void;
}

export function DistrictCoverage({
  districtCode,
  onCoverageCheck,
}: DistrictCoverageProps) {
  const [loading, setLoading] = useState(false);
  const [hasShipping, setHasShipping] = useState<boolean | null>(null);
  const [zoneName, setZoneName] = useState<string | null>(null);

  useEffect(() => {
    if (!districtCode) {
      setHasShipping(null);
      setZoneName(null);
      return;
    }

    checkCoverage();
  }, [districtCode]);

  const checkCoverage = async () => {
    setLoading(true);

    const result = await checkShippingCoverage(districtCode);

    if (result.success) {
      setHasShipping(result.hasShipping);
      setZoneName(result.zone?.name || null);

      if (onCoverageCheck) {
        onCoverageCheck(result.hasShipping);
      }
    }

    setLoading(false);
  };

  if (!districtCode) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando cobertura...</span>
      </div>
    );
  }

  if (hasShipping === null) {
    return null;
  }

  if (hasShipping) {
    return (
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-600">
          ✓ Tenemos cobertura de envío en tu distrito
          {zoneName && (
            <>
              {" "}
              <Badge variant="outline" className="ml-2">
                Zona: {zoneName}
              </Badge>
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        Lo sentimos, aún no tenemos cobertura de envío en tu distrito.
        <br />
        <span className="text-xs">
          Estamos trabajando para expandir nuestra cobertura pronto.
        </span>
      </AlertDescription>
    </Alert>
  );
}