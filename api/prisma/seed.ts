import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog: Record<string, { title: string; author: string; isbn: string; year: number }[]> = {
  'Science Fiction': [
    { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593', year: 1965 },
    { title: 'Neuromancer', author: 'William Gibson', isbn: '9780441569595', year: 1984 },
    { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', year: 1969 },
    { title: 'Foundation', author: 'Isaac Asimov', isbn: '9780553293357', year: 1951 },
  ],
  Fantasy: [
    { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', year: 1937 },
    { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', isbn: '9780547773742', year: 1968 },
    { title: 'The Name of the Wind', author: 'Patrick Rothfuss', isbn: '9780756404741', year: 2007 },
    { title: 'Mistborn: The Final Empire', author: 'Brandon Sanderson', isbn: '9780765311788', year: 2006 },
  ],
  Mystery: [
    { title: 'And Then There Were None', author: 'Agatha Christie', isbn: '9780062073488', year: 1939 },
    { title: 'The Hound of the Baskervilles', author: 'Arthur Conan Doyle', isbn: '9780140437867', year: 1902 },
    { title: 'Gone Girl', author: 'Gillian Flynn', isbn: '9780307588371', year: 2012 },
    { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', isbn: '9780307454546', year: 2005 },
  ],
  'Non-Fiction': [
    { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316110', year: 2011 },
    { title: 'Educated', author: 'Tara Westover', isbn: '9780399590504', year: 2018 },
    { title: 'The Immortal Life of Henrietta Lacks', author: 'Rebecca Skloot', isbn: '9781400052189', year: 2010 },
    { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', year: 2018 },
  ],
};

async function main() {
  // Users
  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@library.test' },
    update: {},
    create: { email: 'librarian@library.test', name: 'Lara Librarian', role: 'LIBRARIAN' },
  });
  const patron = await prisma.user.upsert({
    where: { email: 'patron@library.test' },
    update: {},
    create: { email: 'patron@library.test', name: 'Pat Patron', role: 'PATRON' },
  });

  // Genres + Books (idempotent via upsert)
  for (const [genreName, books] of Object.entries(catalog)) {
    const genre = await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: { name: genreName },
    });
    for (const b of books) {
      await prisma.book.upsert({
        where: { isbn: b.isbn },
        update: {},
        create: {
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          publishedYear: b.year,
          copies: 3,
          genreId: genre.id,
        },
      });
    }
  }

  // Stretch: a couple of reviews
  const dune = await prisma.book.findUnique({ where: { isbn: '9780441013593' } });
  if (dune) {
    await prisma.review.upsert({
      where: { bookId_userId: { bookId: dune.id, userId: patron.id } },
      update: {},
      create: { bookId: dune.id, userId: patron.id, rating: 5, comment: 'A sci-fi classic.' },
    });
  }

  console.log(`Seeded users (${librarian.email}, ${patron.email}), 4 genres, 16 books.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());