import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';

import { HeaderItemComponent } from './header-item.component';

class MockBsModalService {
  show() {
    return { onHide: of(undefined) } as any;
  }
}

describe('HeaderItemComponent', () => {
  let component: HeaderItemComponent;
  let fixture: ComponentFixture<HeaderItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderItemComponent],
      providers: [{ provide: BsModalService, useClass: MockBsModalService }],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
