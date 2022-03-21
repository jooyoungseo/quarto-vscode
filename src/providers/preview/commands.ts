/*---------------------------------------------------------------------------------------------
 *  Copyright (c) RStudio, PBC. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { Command } from "../../core/command";
import { isQuartoDoc } from "../../core/doc";
import { terminalPreview } from "./terminal";

export function previewCommands(): Command[] {
  return [new RenderCommand()];
}

class RenderCommand implements Command {
  private static readonly id = "quarto.render";
  public readonly id = RenderCommand.id;
  async execute() {
    const activeDoc = window.activeTextEditor?.document;
    if (activeDoc && isQuartoDoc(activeDoc)) {
      if (activeDoc.isDirty) {
        await activeDoc.save();
      }
      terminalPreview(activeDoc);
    }
  }
}