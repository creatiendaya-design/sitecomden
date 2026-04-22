"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";

interface AdminNotesCardProps {
  orderId: string;
  currentAdminNotes: string;
}

export default function AdminNotesCard({
  orderId,
  currentAdminNotes,
}: AdminNotesCardProps) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(currentAdminNotes);
  const [loading, setLoading] = useState(false);

  const hasChanged = adminNotes !== currentAdminNotes;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    try {
      const result = await updateOrderStatus({ orderId, adminNotes });
      if (result.success) {
        toast.success("Nota interna guardada");
        router.refresh();
      } else {
        toast.error(result.error || "Error al guardar la nota");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notas internas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="adminNotes" className="text-xs text-muted-foreground">
            Visible solo para el equipo
          </Label>
          <Textarea
            id="adminNotes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Notas internas..."
            rows={3}
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={!hasChanged || loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar nota
        </Button>
      </CardContent>
    </Card>
  );
}
