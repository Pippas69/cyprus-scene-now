DO $$
DECLARE
  vid uuid := 'b3c3805f-6fb6-4c0e-a6a5-907dfe43b6b7';
  cx float := 600; cy float := 50;
  base_r float := 120; row_step float := 22;
  zone_gap float := 3; avail_arc float;
  total_w float := 0; cur_start float := 170;
  zone_end float; radius float; margin float := 1.0;
  a_s float; a_e float; seat_step float;
  angle_deg float; angle_rad float; new_x float; new_y float;
  num_in_row int; row_ord int; i int; zid uuid; max_s int; zone_arc float;
  r record;
  zone_ids text[] := ARRAY[
    '6fe669bd-56bf-45f1-9311-dbd1d2003827','84b46333-2ac8-4615-bed7-64550c179cb3',
    'e3b5b0e6-175d-4e3a-a2f0-eee8f63b47e0','2692ac39-608f-41d3-939a-a21b086a3d2b',
    '88cfdd26-77b6-4edd-a0aa-cce66df2b5d1','16551c22-6eda-4978-855c-f8dfdb9dc30b',
    'b03afd3a-8839-4dd9-9338-5488b9cd6bc3','64cbf972-ad5e-4024-a90e-f16d5e63b68a',
    'aa9b38d1-6ccc-468f-b529-063a4ec951fe'
  ];
  max_seats_arr float[] := ARRAY[0,0,0,0,0,0,0,0,0];
BEGIN
  avail_arc := 170.0 - zone_gap * 8.0;
  FOR i IN 1..9 LOOP
    zid := zone_ids[i]::uuid;
    SELECT COALESCE(MAX(cnt), 1) INTO max_s
    FROM (SELECT COUNT(*)::int as cnt FROM venue_seats WHERE venue_id = vid AND zone_id = zid GROUP BY row_label) sub;
    max_seats_arr[i] := max_s::float;
    total_w := total_w + max_s::float;
  END LOOP;

  FOR i IN 1..9 LOOP
    zid := zone_ids[i]::uuid;
    zone_arc := (max_seats_arr[i] / total_w) * avail_arc;
    zone_end := cur_start - zone_arc;

    FOR r IN (
      SELECT vs.row_label, vs.seat_number,
        rc.cnt as num_in_r,
        ro.rn - 1 as r_ord
      FROM venue_seats vs
      JOIN (SELECT row_label, COUNT(*) as cnt FROM venue_seats WHERE venue_id = vid AND zone_id = zid GROUP BY row_label) rc ON rc.row_label = vs.row_label
      JOIN (SELECT row_label, ROW_NUMBER() OVER (ORDER BY row_label) as rn FROM (SELECT DISTINCT row_label FROM venue_seats WHERE venue_id = vid AND zone_id = zid) d) ro ON ro.row_label = vs.row_label
      WHERE vs.venue_id = vid AND vs.zone_id = zid
      ORDER BY vs.row_label, vs.seat_number
    ) LOOP
      num_in_row := r.num_in_r;
      row_ord := r.r_ord;
      radius := base_r + row_ord * row_step;
      a_s := cur_start - margin;
      a_e := zone_end + margin;
      IF num_in_row = 1 THEN
        angle_deg := (a_s + a_e) / 2.0;
      ELSE
        seat_step := (a_s - a_e) / (num_in_row - 1)::float;
        angle_deg := a_s - (r.seat_number - 1)::float * seat_step;
      END IF;
      angle_rad := radians(angle_deg);
      new_x := cx + radius * cos(angle_rad);
      new_y := cy + radius * sin(angle_rad);
      UPDATE venue_seats SET x = new_x, y = new_y
      WHERE venue_id = vid AND zone_id = zid AND row_label = r.row_label AND seat_number = r.seat_number;
    END LOOP;
    cur_start := zone_end - zone_gap;
  END LOOP;
END $$;