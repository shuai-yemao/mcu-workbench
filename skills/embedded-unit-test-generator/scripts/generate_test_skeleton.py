#!/usr/bin/env python3
"""Generate a conservative unit-test skeleton from analyze_c_module.py JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def sanitize_identifier(value: str) -> str:
    value = re.sub(r"\W+", "_", value)
    value = value.strip("_")
    return value or "ModuleUnderTest"


def module_include(source: str) -> str:
    path = Path(source)
    if path.suffix.lower() in {".c", ".cpp", ".cc"}:
        return path.with_suffix(".h").name
    return path.name


def include_name(value: str | None, fallback_source: str) -> str:
    if not value:
        return "MODULE_UNDER_TEST.h"
    return Path(value).name


def load_analysis(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def unity(analysis: dict[str, Any], placeholder: str) -> str:
    source = analysis.get("source", "MODULE_UNDER_TEST.c")
    include = include_name(analysis.get("header", {}).get("recommended_include"), source)
    functions = [
        f for f in analysis.get("functions", []) if f.get("kind") == "definition" and not f.get("test_harness_candidate")
    ]
    if not functions:
        functions = [f for f in analysis.get("functions", []) if not f.get("test_harness_candidate")][:5]
    tests = []
    runs = []
    for function in functions[:12]:
        name = sanitize_identifier(function.get("name", "function"))
        test_name = f"test_{name}_should_expected_behavior_when_condition"
        if placeholder == "fail":
            placeholder_line = f'TEST_FAIL_MESSAGE("TODO: confirm expected behavior for {function.get("name", name)}");'
        else:
            placeholder_line = f'TEST_IGNORE_MESSAGE("TODO: confirm expected behavior for {function.get("name", name)}");'
        tests.append(
            f"""void {test_name}(void)
{{
    /* Arrange: TODO confirm inputs and dependency behavior. */

    /* Act: TODO call {function.get("name", name)}. */

    /* Assert: TODO replace with evidence-backed assertions. */
    {placeholder_line}
}}
"""
        )
        runs.append(f"    RUN_TEST({test_name});")
    return f"""/*
 * Generated skeleton-only test file.
 * Status: generated, not executed, assertions pending confirmation.
 */
#include "unity.h"
#include "{include}"

void setUp(void)
{{
}}

void tearDown(void)
{{
}}

{chr(10).join(tests)}
int main(void)
{{
    UNITY_BEGIN();
{chr(10).join(runs)}
    return UNITY_END();
}}
"""


def cpputest(analysis: dict[str, Any], placeholder: str) -> str:
    source = analysis.get("source", "MODULE_UNDER_TEST.c")
    include = include_name(analysis.get("header", {}).get("recommended_include"), source)
    group = sanitize_identifier(Path(include).stem.title())
    functions = [
        f for f in analysis.get("functions", []) if f.get("kind") == "definition" and not f.get("test_harness_candidate")
    ] or [f for f in analysis.get("functions", []) if not f.get("test_harness_candidate")][:5]
    tests = []
    for function in functions[:12]:
        name = sanitize_identifier(function.get("name", "Function"))
        if placeholder == "fail":
            placeholder_line = f'FAIL("TODO: confirm expected behavior for {function.get("name", name)}");'
        else:
            placeholder_line = f'IGNORE_TEST({group}, {name}_ShouldExpectedBehavior_WhenCondition)\n{{\n    /* TODO: confirm expected behavior for {function.get("name", name)}. */\n}}'
            tests.append(placeholder_line + "\n")
            continue
        tests.append(
            f"""TEST({group}, {name}_ShouldExpectedBehavior_WhenCondition)
{{
    {placeholder_line}
}}
"""
        )
    return f"""/*
 * Generated skeleton-only test file.
 * Status: generated, not executed, assertions pending confirmation.
 */
extern "C" {{
#include "{include}"
}}

#include "CppUTest/TestHarness.h"
#include "CppUTestExt/MockSupport.h"

TEST_GROUP({group})
{{
    void setup()
    {{
    }}

    void teardown()
    {{
        mock().clear();
    }}
}};

{chr(10).join(tests)}
"""


def googletest(analysis: dict[str, Any], placeholder: str) -> str:
    source = analysis.get("source", "MODULE_UNDER_TEST.c")
    include = include_name(analysis.get("header", {}).get("recommended_include"), source)
    fixture = sanitize_identifier(Path(include).stem.title()) + "Test"
    functions = [
        f for f in analysis.get("functions", []) if f.get("kind") == "definition" and not f.get("test_harness_candidate")
    ] or [f for f in analysis.get("functions", []) if not f.get("test_harness_candidate")][:5]
    tests = []
    for function in functions[:12]:
        name = sanitize_identifier(function.get("name", "Function"))
        if placeholder == "fail":
            placeholder_line = f'FAIL() << "TODO: confirm expected behavior for {function.get("name", name)}";'
        else:
            placeholder_line = f'GTEST_SKIP() << "TODO: confirm expected behavior for {function.get("name", name)}";'
        tests.append(
            f"""TEST_F({fixture}, {name}_ShouldExpectedBehavior_WhenCondition)
{{
    {placeholder_line}
}}
"""
        )
    return f"""/*
 * Generated skeleton-only test file.
 * Status: generated, not executed, assertions pending confirmation.
 */
extern "C" {{
#include "{include}"
}}

#include <gtest/gtest.h>

class {fixture} : public ::testing::Test {{
protected:
    void SetUp() override
    {{
    }}

    void TearDown() override
    {{
    }}
}};

{chr(10).join(tests)}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--analysis", required=True, help="JSON from analyze_c_module.py.")
    parser.add_argument("--framework", choices=["unity", "cpputest", "googletest"], default="unity")
    parser.add_argument("--placeholder", choices=["skip", "fail"], default="skip", help="Use skipped TODO tests by default; choose fail to force CI red.")
    parser.add_argument("--output", help="Output test file. Prints to stdout when omitted.")
    args = parser.parse_args()

    analysis = load_analysis(Path(args.analysis))
    if not analysis.get("ok", False):
        raise SystemExit("Analysis JSON is not ok; inspect warnings/evidence_gaps first.")

    generators = {
        "unity": unity,
        "cpputest": cpputest,
        "googletest": googletest,
    }
    text = generators[args.framework](analysis, args.placeholder)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8", newline="\n")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
