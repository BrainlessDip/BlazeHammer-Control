import { TemplateWorkbench } from "@/components/editor/template-workbench"
import { PageHeader } from "@/components/common/page-header"

export function PayloadEditorPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Payload template"
        description="JSON body resolved per-request by the backend at run time."
      />
      <TemplateWorkbench initialTab="payload" />
    </div>
  )
}
