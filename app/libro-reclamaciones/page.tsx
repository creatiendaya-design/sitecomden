import ComplaintsForm from "@/components/ComplaintsForm";
import { getFormFields, getComplaintsConfig } from "@/actions/complaints";

export default async function LibroReclamacionesPage() {
  const [fieldsResult, configResult] = await Promise.all([
    getFormFields(),
    getComplaintsConfig(),
  ]);

  // Convertir null a undefined para compatibilidad de tipos
  const fields = fieldsResult.success 
    ? fieldsResult.data.map((field) => ({
        ...field,
        section: field.section ?? undefined,
        placeholder: field.placeholder ?? undefined,
        helpText: field.helpText ?? undefined,
        options: field.options ?? undefined,
        minLength: field.minLength ?? undefined,
        maxLength: field.maxLength ?? undefined,
        pattern: field.pattern ?? undefined,
      }))
    : [];
  
  const config = configResult.success ? configResult.data : {};

  return (
    <div className="container py-12">
      <ComplaintsForm fields={fields} config={config} />
    </div>
  );
}