import content from "../data/conteudo.json";
export type SceneId = "celula" | "dna" | "membrana";
export interface Structure {
  name: string;
  section: string;
  description: string;
}
export const structure = (name: string, section: string): Structure => ({
  name,
  section,
  description: content
    .find((c) => c.id === section)!
    .txt[0].replace(/\*+/g, ""),
});
export const sceneData: Record<
  SceneId,
  { name: string; sections: string[]; structures: Structure[] }
> = {
  celula: {
    name: "Célula eucariótica",
    sections: [
      "c5_3",
      "c5_4",
      "c5_5",
      "c5_6",
      "c5_7",
      "c5_8",
      "c5_9",
      "c5_10",
      "c5_11",
    ],
    structures: [
      structure("Membrana plasmática", "c5_1"),
      structure("Núcleo e poros nucleares", "c5_3"),
      structure("Nucléolo", "c5_3"),
      structure("RE rugoso e ribossomos", "c5_8"),
      structure("RE liso", "c5_7"),
      structure("Golgi: cis → trans", "c5_9"),
      structure("Mitocôndria e cristas", "c5_5"),
      structure("Lisossomo", "c5_10"),
      structure("Peroxissomo", "c5_6"),
      structure("Centrossomo e microtúbulos", "c5_11"),
    ],
  },
  dna: {
    name: "Do DNA ao cromossomo",
    sections: ["c2_2", "c2_1", "c3_1"],
    structures: [
      structure("Dupla hélice de DNA", "c3_1"),
      structure("Nucleossomo: octâmero e DNA", "c2_2"),
      structure("Fibra de cromatina", "c2_2"),
      structure("Alças de cromatina", "c2_2"),
      structure("Cromossomo metafásico", "c2_1"),
      structure("Centrômero", "c2_1"),
      structure("Telômeros", "c2_1"),
    ],
  },
  membrana: {
    name: "Membrana plasmática",
    sections: ["c5_1", "c5_2", "c6_3"],
    structures: [
      structure("Fosfolipídios e bicamada", "c5_1"),
      structure("Colesterol", "c5_1"),
      structure("Canal iônico", "c5_2"),
      structure("Na⁺/K⁺-ATPase: 3 Na⁺ saem, 2 K⁺ entram", "c5_1"),
      structure("Transportador ABC", "c5_1"),
      structure("GPCR e proteína G", "c6_3"),
      structure("Glicocálice", "c5_1"),
    ],
  },
};
