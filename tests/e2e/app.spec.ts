import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('예시 자료 → 개념도 3장 → 근거 표 → 내려받기', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('샘플 모드')).toBeVisible();
  await expect(page.getByRole('button', { name: '개념도 만들기' })).toBeDisabled();
  await page.getByRole('button', { name: '예시 자료 넣기' }).click();
  await page.getByRole('button', { name: '개념도 만들기' }).click();
  await expect(page.getByRole('heading', { name: '(샘플) 고등학교 도서관협력수업의 행위자 네트워크' })).toBeVisible();
  await expect(page.getByTestId('evidence-stats')).toContainText('원문에 없음 0');

  // ① 네트워크도
  const net = page.getByRole('img', { name: '행위자 네트워크도' });
  await expect(net.getByText('시간표', { exact: true })).toBeVisible();
  await expect(net.getByText(/OPP 후보 · 높음/)).toBeVisible();
  await page.getByTestId('node-a8').click();
  await expect(page.getByTestId('selected-actor')).toContainText('협력 시간을 제약');
  await page.screenshot({ path: 'test-results/01-network.png', fullPage: true });
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG' }).click()]);
  expect(png.suggestedFilename()).toMatch(/네트워크도\.png$/);
  expect(readFileSync((await png.path())!).subarray(1, 4).toString()).toBe('PNG');

  // ② 번역·OPP
  await page.getByRole('tab', { name: '② 번역·OPP·블랙박스' }).click();
  const tr = page.getByRole('img', { name: '번역·OPP·블랙박스 도' });
  for (const s of ['1. 문제 제기', '2. OPP 설정', '5. 동원']) await expect(tr.getByText(s)).toBeVisible();
  await expect(tr.getByText("'원래 하는 수업'")).toBeVisible();
  await page.screenshot({ path: 'test-results/02-translation.png', fullPage: true });

  // ③ 모순·대안
  await page.getByRole('tab', { name: '③ 모순·대안' }).click();
  await expect(page.getByTestId('contradiction-0')).toContainText('수업 시간 부족');
  await expect(page.getByTestId('contradiction-0')).toContainText('블록 수업');
  await page.screenshot({ path: 'test-results/03-contradiction.png', fullPage: true });

  // 근거 표
  await page.getByRole('tab', { name: '근거 표' }).click();
  await expect(page.getByText('원문 확인').first()).toBeVisible();
  await expect(page.getByText('원문에 없음')).toHaveCount(1); // 요약 줄 하나뿐
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON' }).click()]);
  const data = JSON.parse(readFileSync((await json.path())!, 'utf-8'));
  expect(data.translation).toHaveLength(5);

  // 기록
  await page.reload();
  await expect(page.getByRole('heading', { name: '최근 분석 (이 브라우저)' })).toBeVisible();
});

test('다른 글을 넣으면 근거가 원문에 없다고 표시한다 (샘플 결과는 그 글과 무관)', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('분석할 글').fill('교육부가 AI 디지털교과서와 태블릿을 보급하면 그 기기가 교사와 학생의 상호작용 방식을 바꾸는 행위자가 된다. 어떤 교사는 쓰고 어떤 교사는 쓰지 않는다.');
  await page.getByRole('button', { name: '개념도 만들기' }).click();
  await expect(page.getByTestId('evidence-stats')).toContainText('원문 확인 0');
});

test('한글 파일은 안내', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('자료 파일').setInputFiles({ name: '사례.hwp', mimeType: 'application/x-hwp', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert')).toContainText('본문을 복사해 붙여 넣어');
});
