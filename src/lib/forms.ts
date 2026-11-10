import fs from 'fs';
import path from 'path';

export type FormConfig = {
  postId: string; formId: string; name: string; actions: string[]; redirectTo: string;
  successMessage: string; errorMessage: string; emailTo: string; emailSubject: string;
  fields: { id: string; type: string; label: string; required: string }[];
};

let forms: FormConfig[] | null = null;
export function getFormConfig(postId: string, formId: string): FormConfig | undefined {
  forms ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'forms.json'), 'utf8')) as FormConfig[];
  return forms.find((f) => f.postId === postId && f.formId === formId) || forms.find((f) => f.formId === formId);
}

/** Append one JSON line to data/<file> (created on first use). */
export function appendLog(file: string, data: unknown) {
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, file), JSON.stringify(data) + '\n');
}
