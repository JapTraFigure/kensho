#curl -L 'https://www.tomoku.co.jp/corporate/access.html' | perl -e 'while(<>){ s/\r//g; if(/<h3>/){ chop; $tmp=$_; $tmp=~s/<.+?>//g; print "\n".$tmp.",";} if(/〒/) {chop; $tmp=$_; $tmp=~s/.+?([0-9]+\-[0-9]+).*/$1/; $tmp=~s/<.+?>//g; print $tmp.","; $tmp=$_; $tmp=~s/.+〒[0-9]+\-[0-9]+//; $tmp=~s/<.+?>//; $tmp=~s/^ //; $tmp=~s/<.+?>//g; $tmp=~s/TEL[：:]+/,/; $tmp=~s/ \/ FAX[：:]+/,/; print $tmp;} }'

#curl -L 'https://www.nihonkohden.co.jp/office/honsha.html' >  tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales01.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales02.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales03.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales04.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales05.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales12.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales06.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales07.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales08.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales09.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales11.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/sales10.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/service.html' >> tempo
#curl -L 'https://www.nihonkohden.co.jp/office/kaigai.html' >> tempo

cat tempo | perl -e ' \
    while(<>) { \
    	$QUA = ""; $NAME = ""; $POST = ""; $ADR = ""; $TEL = ""; $FAX = ""; \
	s/\r//g; s/&nbsp//g; \
	if (/<h1 class="title-p">/) {chop; s/.+?<h1 class="title-p">(.+?)<\/h1>.*/$1/; s/<br.+?>//g; $QUA = $_; } \
	if (/<th nowrap="nowrap">/) {chop; s/.+?<th nowrap="nowrap">(.+?)<\/th>.*/$1/; s/<br.+?>//g; $NAME = $_; } \
	if (/<td>〒/) {chop; s/.+?<td>〒(.+?)<.*/$1/; s/<br.+?>//g; $POST = $_; $_=<>; s/<br.+?>//g; $ADR =~ s/<.+?>//g; } \
	if (/alt="TEL"/) {chop; s/<img src[^>]+?>/,/g; s/<br.+?>//g; $TEL = $_; print $QUA.$NAME.$POST.$TEL."\n"; } \
	print; \
    } \
'

