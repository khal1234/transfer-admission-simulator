export type AdmissionWeights = {
  english: number;
  gpa: number;
  document: number;
  interview: number;
  written: number;
  practical: number;
  industryExperience: number;
};

export type AdmissionProfile = {
  id: string;
  label: string;
  weights: AdmissionWeights;
  totalScore: number;
  sourcePage: string;
  englishFormulaText: string | null;
  gpaFormulaText: string | null;
};

const WEIGHT_LABELS: readonly [keyof AdmissionWeights, string][] = [
  ["english", "공인영어"],
  ["gpa", "전적대성적"],
  ["document", "서류평가"],
  ["interview", "면접"],
  ["written", "지필고사"],
  ["practical", "실기"],
  ["industryExperience", "산업체근무경력"],
];

export function formatAdmissionWeights(profile: AdmissionProfile): string {
  const components = WEIGHT_LABELS.flatMap(([key, label]) => {
    const weight = profile.weights[key];
    return weight > 0 ? [`${label} ${weight}점`] : [];
  });
  return `${profile.label}: ${components.join(" + ")} = ${profile.totalScore}점`;
}
