import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NodeSelectorModalComponent } from './node-selector-modal.component';
import { ApiService } from 'src/app/services/api.service';
import { BsModalRef } from 'ngx-bootstrap/modal';

class MockApiService {
  RPCs: any = {
    mainnet: { selected: 'https://mainnet.api.tez.ie', all: ['https://mainnet.api.tez.ie'] },
  };
  selectRpc = async () => {};
  addCustomRpc = async () => {};
}

class MockBsModalRef {
  hide = () => {};
}

describe('NodeSelectorModalComponent', () => {
  let component: NodeSelectorModalComponent;
  let fixture: ComponentFixture<NodeSelectorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [NodeSelectorModalComponent],
      providers: [
        { provide: ApiService, useClass: MockApiService },
        { provide: BsModalRef, useClass: MockBsModalRef },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeSelectorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
