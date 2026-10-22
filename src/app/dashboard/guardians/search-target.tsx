"use client";

import { useState } from "react";
import { SegmentedControl } from "@mantine/core";

import {
  PERSON_SEARCH_OPTIONS,
  type PersonSearchBy,
} from "@/lib/search";

// Controlled search-target control. The selected value is mirrored in a hidden
// input so submitting the surrounding GET form includes `searchBy`.
export function SearchTarget({ defaultValue }: { defaultValue: PersonSearchBy }) {
  const [value, setValue] = useState<PersonSearchBy>(defaultValue);

  return (
    <>
      <SegmentedControl
        value={value}
        onChange={(next) => setValue(next as PersonSearchBy)}
        data={[...PERSON_SEARCH_OPTIONS]}
        size="xs"
        w="fit-content"
      />
      <input type="hidden" name="searchBy" value={value} />
    </>
  );
}
