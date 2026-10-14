import unittest

from agents import analyze_employee, availability_agent, project_fit_agent, workload_agent


class WorkloadAgentTests(unittest.TestCase):
    def test_flags_over_capacity_without_diagnosing_burnout(self):
        result = workload_agent(
            {"name": "Ari", "allocatedCapacity": 115, "maxCapacity": 100}
        )

        self.assertEqual(result["status"], "OVER_CAPACITY")
        self.assertIn("115%", result["summary"])
        self.assertTrue(
            any(
                "rebalance" in recommendation.lower()
                for recommendation in result["recommendations"]
            )
        )
        self.assertNotIn("burnout", result["summary"].lower())

    def test_missing_capacity_is_reported_as_missing(self):
        result = workload_agent({"name": "Ari", "allocatedCapacity": 30})

        self.assertEqual(result["status"], "DATA_NEEDED")


class ProjectFitAgentTests(unittest.TestCase):
    def test_skill_comparison_is_case_insensitive(self):
        result = project_fit_agent(
            {"skills": ["python", "SQL"]},
            {"title": "Analytics", "requiredSkills": ["Python", "Rust"]},
        )

        self.assertEqual(result["status"], "PARTIAL_MATCH")
        self.assertIn("50%", result["summary"])
        self.assertIn("Rust", result["evidence"][1])

    def test_no_selected_project_does_not_invent_a_match(self):
        result = project_fit_agent({"skills": ["Python"]})

        self.assertEqual(result["status"], "PROJECT_NOT_SELECTED")


class AvailabilityAgentTests(unittest.TestCase):
    def test_reports_recorded_headroom_not_calendar_availability(self):
        result = availability_agent(
            {"allocatedCapacity": 75, "maxCapacity": 100}
        )

        self.assertEqual(result["status"], "RECORDED_HEADROOM")
        self.assertIn("25", result["summary"])
        self.assertTrue(any("calendar" in item for item in result["recommendations"]))


class EmployeeAssessmentTests(unittest.TestCase):
    def test_assessment_returns_five_agents_and_decision_support_disclaimer(self):
        result = analyze_employee(
            {
                "id": "E-1",
                "name": "Ari",
                "allocatedCapacity": 105,
                "maxCapacity": 100,
                "stressIndex": 72,
                "skills": ["Python"],
                "stats": {"delivery": 82},
            }
        )

        self.assertEqual(len(result["agents"]), 5)
        self.assertEqual(len(result["logs"]), 5)
        self.assertIn("Decision support only", result["disclaimer"])
        self.assertEqual(result["agents"][4]["status"], "CHECK_IN_SUGGESTED")


if __name__ == "__main__":
    unittest.main()
