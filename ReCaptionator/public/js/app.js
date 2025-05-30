import { initLanguage, updateUILanguage, setupLanguageSwitcher, getTranslation, updateI18nTexts } from './i18n.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('recaptionForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const newCaption = document.getElementById('newCaption');
    const explanation = document.getElementById('explanation');
    const styleAnalysis = document.getElementById('styleAnalysis');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        const text = submitBtn.textContent.trim() || 'Rewrite Caption';
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style="display:none"></span><span class="btn-text">' + text + '</span>';
        console.log('Injected spinner into submit button:', submitBtn.innerHTML);
    }
    const spinner = submitBtn ? submitBtn.querySelector('.spinner-border') : null;
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;

    if (!form) {
        console.error('recaptionForm not found');
        return;
    }
    if (!loading) console.warn('loading element not found');
    if (!results) console.warn('results element not found');
    if (!newCaption) console.warn('newCaption element not found');
    if (!explanation) console.warn('explanation element not found');
    if (!styleAnalysis) console.warn('styleAnalysis element not found');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Disable button and show spinner
        if (submitBtn) {
            submitBtn.disabled = true;
            if (spinner) spinner.style.display = 'inline-block';
            if (btnText) btnText.style.display = 'none';
        }
        if (results) results.classList.add('d-none');

        const caption = document.getElementById('originalCaption')?.value || '';
        const contentType = document.getElementById('contentType')?.value || '';
        const context = document.getElementById('additionalContext')?.value || '';

        try {
            const response = await fetch('/api/recaption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalCaption: caption,
                    contentType,
                    additionalNotes: context
                })
            });

            const data = await response.json();
            console.log('Received data from /api/recaption:', data);

            if (results) results.classList.remove('d-none');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.style.display = 'inline';
            }

            if (response.ok) {
                if (newCaption) {
                    let caption = data.rewrittenCaption || '';
                    caption = caption.replace(/^REWRITTEN CAPTION:\s*"?/, '').replace(/"$/, '');
                    newCaption.textContent = caption;
                    newCaption.classList.remove('text-muted');
                    console.log('Set newCaption:', caption);
                }
                if (explanation) {
                    let expl = data.explanation || '';
                    expl = expl.replace(/^2\.\s*EXPLANATION OF KEY CHANGES:\s*/i, '')
                               .replace(/^EXPLANATION OF CHANGES:\s*/i, '');
                    // Try to split into numbered points
                    const points = expl.split(/(?=\d+\. )/g).map(s => s.trim()).filter(Boolean);
                    if (points.length > 1) {
                        explanation.innerHTML = '<ol>' + points.map(p => `<li>${p.replace(/^\d+\.\s*/, '')}</li>`).join('') + '</ol>';
                    } else {
                        explanation.innerHTML = expl.replace(/\n/g, '<br>');
                    }
                    explanation.classList.remove('text-muted');
                    console.log('Set explanation:', expl);
                }
                if (styleAnalysis) {
                    styleAnalysis.innerHTML = `
                        <div class="stat-item">
                            <div class="stat-value">${data.styleAnalysis?.avgLength ?? '-'}</div>
                            <div class="stat-label">Avg Length</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${(data.styleAnalysis?.commonEmojis || []).join(' ') || '-'}</div>
                            <div class="stat-label">Common Emojis</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${(data.styleAnalysis?.commonHashtags || []).join(' ') || '-'}</div>
                            <div class="stat-label">Common Hashtags</div>
                        </div>
                    `;
                    styleAnalysis.classList.remove('text-muted');
                    console.log('Set styleAnalysis');
                }
            } else {
                alert(data.error || 'Something went wrong.');
            }
        } catch (err) {
            if (results) results.classList.remove('d-none');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.style.display = 'inline';
            }
            alert('An error occurred. Please try again.');
            console.error('Error in fetch or DOM update:', err);
        }
    });
}); 