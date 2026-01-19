import ComplaintsForm from "@/components/ComplaintsForm";
import { getFormFields, getComplaintsConfig } from "@/actions/complaints";

export default async function LibroReclamacionesPage() {
  const [fieldsResult, configResult] = await Promise.all([
    getFormFields(),
    getComplaintsConfig(),
  ]);

  const fields = fieldsResult.success ? fieldsResult.data : [];
  const config = configResult.success ? configResult.data : {};

  return (
    <div className="container py-12">
      <ComplaintsForm fields={fields} config={config} />
    </div>
  );
}