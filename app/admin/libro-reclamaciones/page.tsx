import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Settings, FileText, List, Layout, FolderOpen } from "lucide-react";
import { getAllFormFields } from "@/actions/complaints";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormFieldsList from "@/components/admin/complaints/FormFieldsList";
import ComplaintsList from "@/components/admin/complaints/ComplaintsList";
import ComplaintsConfig from "@/components/admin/complaints/ComplaintsConfig";

export default async function ComplaintsManagementPage() {
  const fieldsResult = await getAllFormFields();
  const fields = fieldsResult.success ? fieldsResult.data : [];

  const fieldTypeLabels: Record<string, string> = {
    text: "Texto",
    email: "Email",
    tel: "Teléfono",
    textarea: "Área de texto",
    select: "Selector",
    radio: "Radio",
    checkbox: "Checkbox",
    date: "Fecha",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Libro de Reclamaciones</h1>
          <p className="text-muted-foreground">
            Gestiona el formulario y las reclamaciones recibidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/libro-reclamaciones/builder">
              <Layout className="mr-2 h-4 w-4" />
              Constructor Visual
            </Link>
          </Button>
          <Button asChild>
            <Link href="/libro-reclamaciones" target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              Ver Formulario Público
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fields" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fields">
            <List className="mr-2 h-4 w-4" />
            Campos del Formulario
          </TabsTrigger>
          <TabsTrigger value="complaints">
            <FileText className="mr-2 h-4 w-4" />
            Reclamaciones
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab: Form Fields */}
        <TabsContent value="fields" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Campos del Formulario</h2>
              <p className="text-muted-foreground">
                Configura los campos que aparecerán en el formulario público
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/libro-reclamaciones/organizar">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Organizar por Sección
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/libro-reclamaciones/campos/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Campo
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Campos ({fields.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">
                    No hay campos configurados
                  </p>
                  <p className="text-muted-foreground">
                    Crea tu primer campo para el formulario
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/admin/libro-reclamaciones/campos/nuevo">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Primer Campo
                    </Link>
                  </Button>
                </div>
              ) : (
                <FormFieldsList fields={fields as any} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Complaints */}
        <TabsContent value="complaints">
          <ComplaintsList />
        </TabsContent>

        {/* Tab: Config */}
        <TabsContent value="config">
          <ComplaintsConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}