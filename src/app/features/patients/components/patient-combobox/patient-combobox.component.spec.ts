import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PatientComboboxComponent } from './patient-combobox.component';
import { Patient } from '../../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { id: 'p1', nombre: 'Ana', apellido: 'García', ...overrides } as Patient;
}

describe('PatientComboboxComponent', () => {
  it('uniquePatients: si dos pacientes DISTINTOS comparten el mismo nombre completo, el segundo gana (riesgo real de datos)', async () => {
    const patients = [
      patient({ id: 'p1', nombre: 'Ana', apellido: 'García' }),
      patient({ id: 'p2', nombre: 'Ana', apellido: 'García' })
    ];
    const { fixture } = await render(PatientComboboxComponent, { inputs: { patients } });
    const component = fixture.componentInstance;

    expect(component.uniquePatients).toHaveLength(1);
    expect(component.uniquePatients[0].id).toBe('p2');
  });

  it('filteredPatients filtra por nombre completo, case-insensitive', async () => {
    const patients = [patient({ id: 'p1', nombre: 'Ana' }), patient({ id: 'p2', nombre: 'Bruno' })];
    const { fixture } = await render(PatientComboboxComponent, { inputs: { patients, value: 'ana' } });

    expect(fixture.componentInstance.filteredPatients.map(p => p.id)).toEqual(['p1']);
  });

  it('escribir emite valueChange y limpia la selección previa (selectPatient(null))', async () => {
    const valueChange = vi.fn();
    const selectPatient = vi.fn();
    await render(PatientComboboxComponent, {
      inputs: { patients: [patient()] },
      on: { valueChange, selectPatient }
    });

    const input = screen.getByRole('textbox');
    const user = userEvent.setup();
    await user.type(input, 'x');

    expect(valueChange).toHaveBeenCalled();
    expect(selectPatient).toHaveBeenCalledWith(null);
  });

  it('choosePatient setea el value al nombre completo y emite ambos outputs', async () => {
    const valueChange = vi.fn();
    const selectPatient = vi.fn();
    const p = patient();
    const { fixture } = await render(PatientComboboxComponent, {
      inputs: { patients: [p] },
      on: { valueChange, selectPatient }
    });

    fixture.componentInstance.choosePatient(p);

    expect(valueChange).toHaveBeenCalledWith('Ana García');
    expect(selectPatient).toHaveBeenCalledWith(p);
  });
});
