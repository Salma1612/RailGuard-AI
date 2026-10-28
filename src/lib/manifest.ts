import raw from "../../public/models/manifest.json";

export interface ModelManifest {
  id: string;
  name: string;
  file: string;
  sha256: string;
  size_bytes: number;
  input_name: string;
  output_name: string;
  image_size: number;
  class_names: string[];
  mean: number[];
  std: number[];
  checkpoint: {
    best_epoch: number | null;
    trained_at: string | null;
    val_accuracy: number | null;
    val_macro_f1: number | null;
    pretrained_imagenet: boolean | null;
    split_fingerprint: string | null;
    torch_version: string | null;
  };
  onnx_parity: { opset: number; max_abs_logit_diff: number; max_abs_prob_diff: number; argmax_agreement: string; n_inputs: number };
}

export const manifest = raw as unknown as { models: Record<string, ModelManifest>; class_names: string[]; generated_at: string };
export const modelUrl = (m: ModelManifest) => `/models/${m.file}`;
