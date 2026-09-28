import { Stack, Tabs, TabsList, TabsPanel, TabsTab, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import {
  listAcademicYears,
  listAllCompetencies,
  listAllSubjects,
  listLevels,
  listRooms,
  listSessions,
  listTerms,
} from "@/lib/lookups";
import { AcademicYearsPanel } from "./academic-years-panel";
import { LevelsPanel } from "./levels-panel";
import { RoomsPanel } from "./rooms-panel";
import { SessionsPanel } from "./sessions-panel";
import { SubjectsPanel } from "./subjects-panel";
import { TermsPanel } from "./terms-panel";

export default async function ManagePage() {
  await requireRole("manager");

  const [levels, rooms, sessions, subjects, competencies, years, terms] =
    await Promise.all([
      listLevels(),
      listRooms(),
      listSessions(),
      listAllSubjects(),
      listAllCompetencies(),
      listAcademicYears(),
      listTerms(),
    ]);

  return (
    <Stack gap="md">
      <Title order={2}>Beheer</Title>

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTab value="levels">Niveaus</TabsTab>
          <TabsTab value="rooms">Lokalen</TabsTab>
          <TabsTab value="subjects">Vakken</TabsTab>
          <TabsTab value="sessions">Tijdsloten</TabsTab>
          <TabsTab value="years">Schooljaren</TabsTab>
          <TabsTab value="terms">Periodes</TabsTab>
        </TabsList>

        <TabsPanel value="levels" pt="md">
          <LevelsPanel levels={levels} />
        </TabsPanel>
        <TabsPanel value="rooms" pt="md">
          <RoomsPanel rooms={rooms} />
        </TabsPanel>
        <TabsPanel value="subjects" pt="md">
          <SubjectsPanel
            levels={levels}
            subjects={subjects}
            competencies={competencies}
          />
        </TabsPanel>
        <TabsPanel value="sessions" pt="md">
          <SessionsPanel sessions={sessions} />
        </TabsPanel>
        <TabsPanel value="years" pt="md">
          <AcademicYearsPanel years={years} />
        </TabsPanel>
        <TabsPanel value="terms" pt="md">
          <TermsPanel years={years} terms={terms} />
        </TabsPanel>
      </Tabs>
    </Stack>
  );
}
