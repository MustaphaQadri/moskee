import { Stack, Tabs, TabsList, TabsPanel, TabsTab, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import { getDonationSetting } from "@/lib/donations";
import { getRegistrationSetting } from "@/lib/registration";
import {
  listAcademicYears,
  listAllSubjects,
  listLevels,
  listRooms,
  listSessions,
  listTerms,
} from "@/lib/lookups";
import { AcademicYearsPanel } from "./academic-years-panel";
import { DonationsPanel } from "./donations-panel";
import { LevelsPanel } from "./levels-panel";
import { RegistrationPanel } from "./registration-panel";
import { RoomsPanel } from "./rooms-panel";
import { SessionsPanel } from "./sessions-panel";
import { SubjectsPanel } from "./subjects-panel";
import { TermsPanel } from "./terms-panel";

export default async function ManagePage() {
  await requireRole("manager");

  const [levels, rooms, sessions, subjects, years, terms, donation, registration] =
    await Promise.all([
      listLevels(),
      listRooms(),
      listSessions(),
      listAllSubjects(),
      listAcademicYears(),
      listTerms(),
      getDonationSetting(),
      getRegistrationSetting(),
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
          <TabsTab value="donations">Donaties</TabsTab>
          <TabsTab value="registration">Registratie</TabsTab>
        </TabsList>

        <TabsPanel value="levels" pt="md">
          <LevelsPanel levels={levels} />
        </TabsPanel>
        <TabsPanel value="rooms" pt="md">
          <RoomsPanel rooms={rooms} />
        </TabsPanel>
        <TabsPanel value="subjects" pt="md">
          <SubjectsPanel levels={levels} subjects={subjects} />
        </TabsPanel>
        <TabsPanel value="sessions" pt="md">
          <SessionsPanel sessions={sessions} />
        </TabsPanel>
        <TabsPanel value="years" pt="md">
          <AcademicYearsPanel years={years} />
        </TabsPanel>
        <TabsPanel value="terms" pt="md">
          <TermsPanel terms={terms} />
        </TabsPanel>
        <TabsPanel value="donations" pt="md">
          <DonationsPanel defaultAmount={donation.defaultAmount} />
        </TabsPanel>
        <TabsPanel value="registration" pt="md">
          <RegistrationPanel
            linkValidityDays={registration.linkValidityDays}
            archiveRetentionMonths={registration.archiveRetentionMonths}
          />
        </TabsPanel>
      </Tabs>
    </Stack>
  );
}
