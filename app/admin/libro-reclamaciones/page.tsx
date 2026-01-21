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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header - RESPONSIVE */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Libro de Reclamaciones</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona el formulario y las reclamaciones recibidas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/admin/libro-reclamaciones/builder">
              <Layout className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Constructor</span>
              <span className="sm:hidden">Constructor Visual</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/libro-reclamaciones" target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ver Formulario</span>
              <span className="sm:hidden">Formulario</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs - RESPONSIVE */}
      <Tabs defaultValue="fields" className="space-y-4 md:space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="fields" className="text-xs md:text-sm">
            <List className="mr-0 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Campos</span>
          </TabsTrigger>
          <TabsTrigger value="complaints" className="text-xs md:text-sm">
            <FileText className="mr-0 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Reclamaciones</span>
            <span className="sm:hidden">Reclamos</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs md:text-sm">
            <Settings className="mr-0 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Form Fields */}
        <TabsContent value="fields" className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Campos del Formulario</h2>
              <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                Configura los campos que aparecerán en el formulario público
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/admin/libro-reclamaciones/organizar">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Organizar</span>
                  <span className="sm:hidden">Organizar Secciones</span>
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/admin/libro-reclamaciones/campos/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar Campo</span>
                  <span className="sm:hidden">Nuevo</span>
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Lista de Campos ({fields.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  <p className="mt-4 text-base md:text-lg font-medium">
                    No hay campos configurados
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Crea tu primer campo para el formulario
                  </p>
                  <Button asChild className="mt-4" size="sm">
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