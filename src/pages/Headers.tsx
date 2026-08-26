import { TemplateWorkbench } from "@/components/editor/template-workbench"
import { PageHeader } from "@/components/common/page-header"

export function HeadersEditorPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Headers template"
        description="JSON headers applied to every request of a run."
      />
      <TemplateWorkbench initialTab="headers" />
    </div>
  )
}
