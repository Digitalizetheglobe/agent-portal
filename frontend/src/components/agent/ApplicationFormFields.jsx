import React from 'react';
import { APPLICATION_GROUPS, isFieldRequired } from '../../utils/agentApplication';
import { cn } from '../../lib/utils';

const inputClass =
  'w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition disabled:opacity-60';

/**
 * Editable application fields, driven by the shared spec.
 * `groups` limits which sections are shown (by id); default is all.
 */
const ApplicationFormFields = ({ values, onChange, groups, disabled = false }) => {
  const agentType = values.agentType;
  const set = (key, value) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-6">
      {APPLICATION_GROUPS.filter((g) => !groups || groups.includes(g.id)).map((group) => (
        <fieldset key={group.id} className="space-y-4">
          <legend className="text-sm font-semibold text-foreground mb-1">{group.title}</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields
              .filter((f) => !f.showIf || f.showIf(values))
              .map((f) => {
                const required = isFieldRequired(f, agentType);
                const id = `app-${f.key}`;
                return (
                  <div key={f.key} className={cn(f.wide && 'md:col-span-2')}>
                    <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
                      {f.label}
                      {required && <span className="text-red-500"> *</span>}
                    </label>

                    {f.type === 'agentType' ? (
                      <div id={id} className="flex gap-3" role="radiogroup">
                        {[['company', 'Company'], ['individual', 'Individual']].map(([val, text]) => (
                          <label
                            key={val}
                            className={cn(
                              'flex-1 cursor-pointer text-center border rounded-lg px-3 py-2.5 text-sm font-medium transition',
                              values.agentType === val ? 'border-primary bg-primary/5 text-primary' : 'border-input',
                              disabled && 'opacity-60 cursor-not-allowed'
                            )}
                          >
                            <input
                              type="radio"
                              name="agentType"
                              className="sr-only"
                              value={val}
                              checked={values.agentType === val}
                              onChange={() => set('agentType', val)}
                              disabled={disabled}
                            />
                            {text}
                          </label>
                        ))}
                      </div>
                    ) : f.type === 'yesNo' ? (
                      <select
                        id={id}
                        className={inputClass}
                        value={values[f.key] ? 'yes' : 'no'}
                        onChange={(e) => set(f.key, e.target.value === 'yes')}
                        disabled={disabled}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        id={id}
                        rows={2}
                        className={cn(inputClass, 'resize-none')}
                        value={values[f.key] ?? ''}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        disabled={disabled}
                        required={required}
                      />
                    ) : (
                      <input
                        id={id}
                        className={inputClass}
                        value={values[f.key] ?? ''}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        disabled={disabled}
                        required={required || (f.key === 'relativeName' && values.isRelativeOfEmployee === true)}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </fieldset>
      ))}
    </div>
  );
};

export default ApplicationFormFields;
