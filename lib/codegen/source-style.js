function guard(prefix) {
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_H`;
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function fileHeader(fileName, summary, flow = '生成的切片参与已声明的分层契约。', dependencies = []) {
  const dependencyLines = dependencies.length
    ? dependencies.map((item) => ` * - ${item}`).join('\n')
    : ' * - None.';
  return `/******************************************************************************\n * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.\n *\n * All Rights Reserved.\n *\n * @file ${fileName}\n *\n * @par dependencies\n${dependencyLines}\n *\n * @author Jack | R&D Dept. | EternalChip\n *\n * @brief ${summary}\n *\n * @version V1.0 ${currentDate()}\n *\n * @note 1 tab == 4 spaces.\n *\n ******************************************************************************/\n`;
}

module.exports = { currentDate, fileHeader, guard };
