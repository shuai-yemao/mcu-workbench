extern "C" {
#include "MODULE_UNDER_TEST.h"
}

#include "CppUTest/TestHarness.h"
#include "CppUTestExt/MockSupport.h"

TEST_GROUP(ModuleUnderTest)
{
    void setup()
    {
    }

    void teardown()
    {
        mock().clear();
    }
};

TEST(ModuleUnderTest, FunctionName_ShouldExpectedBehavior_WhenCondition)
{
    FAIL("TODO: replace with evidence-backed assertions");
}
