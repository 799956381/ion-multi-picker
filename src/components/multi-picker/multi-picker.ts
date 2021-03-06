import { AfterContentInit, OnInit, Component, EventEmitter, forwardRef, HostListener, Input, OnDestroy, Optional, Output, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Picker, PickerController, Form, Item } from 'ionic-angular';
import { MultiPickerColumn, MultiPickerOption } from './multi-picker-options';

export const MULTI_PICKER_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MultiPicker),
  multi: true
};

@Component({
  selector: 'ion-multi-picker',
  template: '<div class="multi-picker-text">{{_text}}</div>' +
  '<button aria-haspopup="true" ' +
  'type="button" ' +
  '[id]="id" ' +
  'ion-button="item-cover" ' +
  '[attr.aria-labelledby]="_labelId" ' +
  '[attr.aria-disabled]="_disabled" ' +
  'class="item-cover">' +
  '</button>',
  host: {
    '[class.multi-picke-disabled]': '_disabled'
  },

  providers: [MULTI_PICKER_VALUE_ACCESSOR],
  encapsulation: ViewEncapsulation.None,
})

export class MultiPicker implements AfterContentInit, ControlValueAccessor, OnDestroy {
  _disabled: any = false;
  _labelId: string = '';
  _text: string = '';
  _fn: Function;
  _isOpen: boolean = false;
  _value: string = '';

  /**
   * @private
   */
  id: string;
  /**
   * @private
   */

  /**
   * @input {string} The text to display on the picker's cancel button. Default: `Cancel`.
   */
  @Input() cancelText: string = 'Cancel';

  /**
   * @input {string} The text to display on the picker's "Done" button. Default: `Done`.
   */
  @Input() doneText: string = 'Done';


  /**
   * @input
   */
  @Input() multiPickerColumns: MultiPickerColumn[] = [];

  /**
   * @output {any} Any expression to evaluate when the multi picker selection has changed.
   */
  @Output() ionChange: EventEmitter<any> = new EventEmitter();

  /**
   * @output {any} Any expression to evaluate when the multi pickker selection was cancelled.
   */
  @Output() ionCancel: EventEmitter<any> = new EventEmitter();

  constructor(
    private _form: Form,
    @Optional() private _item: Item,
    @Optional() private _pickerCtrl: PickerController
  ) {
    this._form.register(this);
    if (_item) {
      this.id = 'dt-' + _item.registerInput('multi-picker');
      this._labelId = 'lbl-' + _item.id;
      this._item.setElementClass('item-multi-picker', true);
    }
  }

  @HostListener('click', ['$event'])
  _click(ev: UIEvent) {
    if (ev.detail === 0) {
      // do not continue if the click event came from a form submit
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    this.open();
  }

  @HostListener('keyup.space')
  _keyup() {
    if (!this._isOpen) {
      this.open();
    }
  }

  /**
   * @private
   */
  open() {
    if (this._disabled) {
      return;
    }

    console.debug('multi picker, open picker');

    // the user may have assigned some options specifically for the alert
    let pickerOptions: any = {};

    let picker = this._pickerCtrl.create(pickerOptions);
    pickerOptions.buttons = [
      {
        text: this.cancelText,
        role: 'cancel',
        handler: () => {
          this.ionCancel.emit(null);
        }
      },
      {
        text: this.doneText,
        handler: (data: any) => {
          console.log('multi picker, done', data);
          this.onChange(data);
          this.ionChange.emit(data);
        }
      }
    ];

    this.generate(picker);

    if (this.multiPickerColumns.length > 1 && this.multiPickerColumns[1].options[0].parentVal) {
      for (let i = 0; i < picker.getColumns().length; i++) {
        this.validate(picker);
      }

      picker.ionChange.subscribe(() => {
        this.validate(picker);
      });
    }

    picker.present(pickerOptions);

    this._isOpen = true;
    picker.onDidDismiss(() => {
      this._isOpen = false;
    });
  }

  /**
   * @private
   */
  generate(picker: Picker) {
    let values = this._value.split(' ');
    this.multiPickerColumns.forEach((col, index) => {
      console.log(col.options);
      let selectedIndex = col.options.findIndex(option => option.value == values[index]);
      if (selectedIndex == -1 && index > 0) {
        let preCol = picker.getColumns()[index - 1];
        let preOption: MultiPickerOption = preCol.options[preCol.selectedIndex];
        selectedIndex = col.options.findIndex(option => this.getOptionParentValue(index, option) == preOption.value);
      }

      let column: any = {
        name: col.name || index.toString(),
        options: col.options.map(option => { return { text: option.text, value: option.value, disabled: false } }),
        selectedIndex: selectedIndex != -1 ? selectedIndex : 0
      }

      picker.addColumn(column);
    });

    this.divyColumns(picker);
  }

  /**
   * @private
   */
  validate(picker: Picker) {
    console.log('validate');
    let columns = picker.getColumns();
    for (let i = 1; i < columns.length; i++) {
      let curCol = columns[i];
      let preCol = columns[i - 1];
      let curOption: MultiPickerOption = curCol.options[curCol.selectedIndex];
      let preOption: MultiPickerOption = preCol.options[preCol.selectedIndex];
      let selectedOptionWillChanged: boolean = false;
      let curParentVal = this.getOptionParentValue(i, curOption);
      if (curParentVal && curParentVal != preOption.value) {
        selectedOptionWillChanged = true;
      }
      if (selectedOptionWillChanged) {
        curCol.options.forEach((option: MultiPickerOption, index) => {
          let parentVal = this.getOptionParentValue(i, option);
          option.disabled = parentVal != preOption.value || index > curCol.options.findIndex((opt: MultiPickerOption) => this.getOptionParentValue(i, opt) == preOption.value);
        });

        break;
      } else {
        curCol.options.forEach((option: MultiPickerOption, index) => {
          let parentVal = this.getOptionParentValue(i, option);
          option.disabled = parentVal != null && parentVal != preOption.value;
        });
      }
    }
    picker.refresh();
  }

  getOptionParentValue(colIndex, option) {
    return this.multiPickerColumns[colIndex].options.find(opt => opt.value == option.value).parentVal;
  }

  /**
   * @private
   */
  divyColumns(picker: Picker) {
    let pickerColumns = picker.getColumns();
    let columns: number[] = [];

    pickerColumns.forEach((col, i) => {
      columns.push(0);

      col.options.forEach(opt => {
        if (opt.text.replace(/[^\x00-\xff]/g, "01").length > columns[i]) {
          columns[i] = opt.text.replace(/[^\x00-\xff]/g, "01").length;
        }
      });

    });

    if (columns.length === 2) {
      var width = Math.max(columns[0], columns[1]);
      pickerColumns[0].columnWidth = pickerColumns[1].columnWidth = `${width * 16}px`;

    } else if (columns.length === 3) {
      var width = Math.max(columns[0], columns[2]);
      pickerColumns[1].columnWidth = `${columns[1] * 16}px`;
      pickerColumns[0].columnWidth = pickerColumns[2].columnWidth = `${width * 16}px`;

    } else if (columns.length > 3) {
      columns.forEach((col, i) => {
        pickerColumns[i].columnWidth = `${col * 12}px`;
      });
    }
  }

  /**
   * @private
   */
  setValue(newData: any) {
    this._value = newData || '';
  }

  /**
   * @private
   */
  getValue(): string {
    return this._value;
  }

  /**
   * @private
   */
  checkHasValue(inputValue: any) {
    if (this._item) {
      this._item.setElementClass('input-has-value', !!(inputValue && inputValue !== ''));
    }
  }

  /**
   * @private
   */
  updateText() {
    this._text = '';
    let values: string[] = this._value.split(' ');
    this.multiPickerColumns.forEach((col, index) => {
      let option = col.options.find(option => option.value == values[index]);
      if (option) {
        this._text += `${option.text} `
      }
    });
    this._text.trim();
  }

  /**
   * @input {boolean} Whether or not the multi picker component is disabled. Default `false`.
   */
  @Input()
  get disabled() {
    return this._disabled;
  }

  set disabled(val: boolean) {
    this._disabled = val;
    this._item && this._item.setElementClass('item-multi-picker-disabled', this._disabled);
  }

  /**
   * @private
   */
  writeValue(val: any) {
    console.debug('multi picker, writeValue', val);
    this.setValue(val);
    this.updateText();
    this.checkHasValue(val);
  }

  /**
   * @private
   */
  ngAfterContentInit() {
    // update how the multi picker value is displayed as formatted text
    this.updateText();
  }

  /**
   * @private
   */
  registerOnChange(fn: Function): void {
    this._fn = fn;
    this.onChange = (val: any) => {
      console.debug('datetime, onChange', val);
      this.setValue(this.convertObjectToString(val));
      this.updateText();
      this.checkHasValue(val);

      fn(this._value);
      this.onTouched();
    };
  }

  /**
   * @private
   */
  registerOnTouched(fn: any) { this.onTouched = fn; }

  /**
  * @private
  */
  onChange(val: any) {
    // onChange used when there is not an formControlName
    console.debug('multi picker, onChange w/out formControlName', val);
    this.setValue(this.convertObjectToString(val));
    this.updateText();
    this.onTouched();
  }

  /**
  * @private
  */
  onTouched() { }

  /**
  * @private
  */
  ngOnDestroy() {
    this._form.deregister(this);
  }

  /**
  * @private convert the Picker ionChange event object data to string
  */
  convertObjectToString(newData) {
    let value = ``;
    this.multiPickerColumns.forEach((col, index) => {
      value += `${newData[col.name || index.toString()].value} `;
    })
    return value.trim();
  }
}
