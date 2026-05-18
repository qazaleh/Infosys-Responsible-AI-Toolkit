/** SPDX-License-Identifier: MIT
Copyright 2024 - 2025 Infosys Ltd.
"Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
*/
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RoleManagerService } from '../services/role-maganer.service';

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.css']
})
export class WorkbenchComponent {
  // FOR SHIMMER LOADING
  isLoadingWorkbench = true;
  isLoadingTabs = true;
  showHomeHeading = true;
  isLlmOfficeView = false;
  //
  constructor(
    public roleService: RoleManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLlmOfficeView = this.isLlmOfficeRoute();
    this.showHomeHeading = !this.isLlmOfficeView;

    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    // make is loading and then after 2 seconds make it false
    // setTimeout(() => {
    this.isLoadingWorkbench = false;
    // }, 400);
    // setTimeout(() => {
    this.isLoadingTabs = false;
    // }, 1000);
  }

  shouldShowWorkbenchTab(subtab: string): boolean {
    if (!this.roleService.checkSubtabExists('Workbench', subtab)) {
      return false;
    }

    if (!this.isLlmOfficeView) {
      return true;
    }

    return subtab === 'Unstructured-Text' || subtab === 'Structured-Text';
  }

  private isLlmOfficeRoute(): boolean {
    return this.router.url.includes('/llm-office') || this.router.url.includes('/llm-evaluations');
  }
}
