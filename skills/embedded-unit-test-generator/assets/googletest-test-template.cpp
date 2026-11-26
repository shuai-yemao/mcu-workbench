extern "C" {
#include "MODULE_UNDER_TEST.h"
}

#include <gtest/gtest.h>

class ModuleUnderTestTest : public ::testing::Test {
protected:
    void SetUp() override
    {
    }

    void TearDown() override
    {
    }
};

TEST_F(ModuleUnderTestTest, FunctionName_ShouldExpectedBehavior_WhenCondition)
{
    FAIL() << "TODO: replace with evidence-backed assertions";
}
