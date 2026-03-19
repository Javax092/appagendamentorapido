-- ALTERACAO: seed inicial dos barbeiros atuais.
insert into public.barbers (
  id,
  name,
  short_code,
  role_title,
  phone,
  specialty,
  bio,
  photo_key,
  hero_tagline,
  working_start,
  working_end,
  days_off,
  break_ranges,
  is_active,
  sort_order
) values
  (
    'lucas',
    'Lucas',
    'LC',
    'Master barber',
    '5592999991111',
    'Corte social refinado, acabamento preciso e atendimento de assinatura.',
    'Indicado para quem busca imagem alinhada, corte executivo e constancia no padrao de atendimento.',
    'heritage',
    'Corte social de assinatura com presenca e acabamento limpo.',
    '09:00',
    '20:00',
    array[0]::smallint[],
    '[{"start":"12:00","end":"13:00"}]'::jsonb,
    true,
    1
  ),
  (
    'luquinhas',
    'Luquinhas',
    'LQ',
    'Style specialist',
    '5592999992222',
    'Visagismo, barba premium e leitura moderna de estilo.',
    'Ideal para transformacao completa, barba marcada e servicos de detalhe com linguagem atual.',
    'editorial',
    'Acabamento moderno com desenho forte e leitura atual.',
    '10:00',
    '21:00',
    array[1]::smallint[],
    '[{"start":"14:00","end":"15:00"}]'::jsonb,
    true,
    2
  );

-- ALTERACAO: seed inicial dos servicos atuais.
insert into public.services (
  id,
  barber_id,
  name,
  badge,
  price,
  duration,
  category,
  description,
  is_active,
  sort_order
) values
  (
    'svc-lucas-1',
    'lucas',
    'Corte de assinatura',
    'Mais reservado',
    55.00,
    45,
    'Cabelo',
    'Tesoura, maquina e acabamento preciso para manter uma imagem alinhada do inicio ao fim.',
    true,
    1
  ),
  (
    'svc-lucas-2',
    'lucas',
    'Barba completa',
    'Toalha quente',
    38.00,
    30,
    'Barba',
    'Contorno detalhado, toalha quente e finalizacao para uma barba mais firme e bem desenhada.',
    true,
    2
  ),
  (
    'svc-lucas-3',
    'lucas',
    'Acabamento executivo',
    'Manutencao',
    25.00,
    20,
    'Detalhes',
    'Pezinho, nuca e alinhamento rapido para manter o corte sempre limpo.',
    true,
    3
  ),
  (
    'svc-luquinhas-1',
    'luquinhas',
    'Fade de assinatura',
    'Alta procura',
    60.00,
    50,
    'Cabelo',
    'Degrade preciso com transicao limpa, textura controlada e acabamento de alto nivel.',
    true,
    1
  ),
  (
    'svc-luquinhas-2',
    'luquinhas',
    'Combo de presenca',
    'Experiencia completa',
    92.00,
    80,
    'Combo',
    'Corte, barba e finalizacao em uma sessao completa para elevar a imagem com consistencia.',
    true,
    2
  ),
  (
    'svc-luquinhas-3',
    'luquinhas',
    'Sobrancelha alinhada',
    'Detalhe fino',
    18.00,
    20,
    'Detalhes',
    'Alinhamento preciso para fechar o visual com mais definicao.',
    true,
    3
  );
