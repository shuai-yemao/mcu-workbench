#include "unity.h"

/* 替换为被测模块。 */
#include "MODULE_UNDER_TEST.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_FUNCTION_NAME_should_EXPECTED_BEHAVIOR_when_CONDITION(void)
{
    /* 准备 */

    /* 执行 */

    /* 断言 */
    TEST_FAIL_MESSAGE("TODO: replace with evidence-backed assertions");
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_FUNCTION_NAME_should_EXPECTED_BEHAVIOR_when_CONDITION);
    return UNITY_END();
}
